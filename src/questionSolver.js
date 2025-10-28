// Question Solver Module
//const gptManager = require('./gptManager');
const {gptManager, AnswerType} = require('./gptManager');
const configStore = require('./configStore');


class QuestionSolver {
    constructor() {
        // Avoid concurrent GPT requests
        this.isRequestInFlight = false;

        // DOM selector configurations
        this.selectors = {
            questionNode: {
                qtext: '.qtext',
                subquestion: '.subquestion',
                content: '.content',
                form: 'form',
                informationitem: '.informationitem',
                submitbtns: '.submitbtns',
                // Új válasz típus szelektorok
                textAnswer: '.answer input[type="text"]',
                multipleChoice: 'input[type="radio"]',
                checkbox: 'input[type="checkbox"]',
                select: 'select',
                answerContainer: '.answer'
            },
            answerNode: {
                answer: '.answer',
                rightanswer: '.rightanswer',
                options: 'option',
                select: 'select'
            }
        };
        this.pageMatchers = [
            {
                matchString: 'moodle',
                testPage: {
                    match: (url) => {
                        return url.includes('/quiz/') && url.includes('attempt.php');
                    },
                    action: (url) => {
                        this.handleMoodleQuiz(url);
                    }
                },
                resultPage: {
                    match: (url) => {
                        return url.includes('/quiz/') && url.includes('review.php');
                    },
                    action: (url) => {
                        this.handleMoodleResults(url);
                    }
                },
                default: {
                    match: (url) => {
                        return !url.includes('/quiz/') && !url.includes('review.php');
                    },
                    action: (url) => {
                        this.handleMoodleDefault(url);
                    }
                }
            }
        ];
    }

    init() {
        this.currentUrl = window.location.href;
        this.handlePageMatch(this.currentUrl);
    }

    handlePageMatch(url) {
        try {
            this.pageMatchers.some((matcher) => {
               
                    if (matcher.testPage && matcher.testPage.match(url)) {
                        matcher.testPage.action(url);
                        return true;
                    } else if (matcher.resultPage && matcher.resultPage.match(url)) {
                        matcher.resultPage.action(url);
                        return true;
                    } else if (matcher.default && matcher.default.match(url)) {
                        matcher.default.action(url);
                        return true;
                    }
      
                return false;
            });
        } catch (error) {
            console.error('Error in page matcher:', error);
        }
    }

    // Handler methods for Canvas
    handleCanvasQuiz(url) {
        console.log('Handling Canvas quiz page');
                this.getQuizData().then(questions => {
            questions.forEach(question => {
                this.applyModificationsToQuestion(question);
            })}).catch(error => {
                console.error('Error handling Moodle quiz:', error);
            });
    }

    handleMoodleQuiz(url) {
        console.log('Handling Moodle quiz page');
        this.getQuizData().then(questions => {
            questions.forEach(question => {
                this.applyModificationsToQuestion(question);
            })}).catch(error => {
                console.error('Error handling Moodle quiz:', error);
            });
    }

    /**
     * Gets all question data from the current quiz page
     * @returns {Promise<Array>} Array of question objects
     */
    async getQuizData() {
        try {
            const questionNodes = this.getQuestionNodes();
            if (!questionNodes || questionNodes.length === 0) {
                console.warn('No question nodes found');
                return [];
            }

            const questions = [];
            let i = 0;

            while (i < questionNodes.length &&
                   questionNodes[i].tagName === 'DIV' &&
                   questionNodes[i].className !== this.selectors.questionNode.submitbtns.slice(1)) {
                
                const questionData = await this.getQuestionPromiseForSingleQuestion(questionNodes[i]);
                if (questionData.success) {
                    questions.push(questionData);
                }
                i++;
            }

            return questions;

        } catch (error) {
            console.error('Error in getQuizData:', error);
            return [];
        }
    }

    /**
     * Gets all question nodes from the page
     * @returns {Array<Element>} Array of DOM nodes containing questions
     */
    getQuestionNodes() {
        const variants = {
            // Moodle: each question is wrapped in a div.que (e.g., <div id="question-..." class="que multichoice ...">)
            moodleQuestions: () => {
                const nodes = Array.from(document.querySelectorAll('div.que'))
                    .filter(n => n.querySelector('.qtext') && n.querySelector('.answer'));
                return nodes.length > 0 ? nodes : null;
            },
            hasInformationText: () => {
                const form = document.getElementsByTagName(this.selectors.questionNode.form)[1];
                if (!form) return null;
                
                const firstChild = form.childNodes[0]?.childNodes[0];
                if (!firstChild?.className?.includes('informationitem')) return null;
                
                return Array.from(form.childNodes[0].childNodes)
                    .filter(node => !node.className?.includes('informationitem'));
            },
            formFirst: () => {
                const form = document.getElementsByTagName(this.selectors.questionNode.form)[0];
                if (!form) return null;
                
                const nodes = Array.from(form.childNodes[0]?.childNodes || []);
                return nodes.length > 0 && nodes.every(node => node.tagName) ? nodes : null;
            },
            formSecond: () => {
                const form = document.getElementsByTagName(this.selectors.questionNode.form)[1];
                if (!form) return null;
                
                const nodes = Array.from(form.childNodes[0]?.childNodes || []);
                return nodes.length > 0 ? nodes : null;
            }
        };

        // Try each variant until we find one that works
        for (const getNodes of Object.values(variants)) {
            try {
                const nodes = getNodes();
                if (nodes) {
                    return nodes;
                }
            } catch (error) {
                console.debug('Question node variant failed:', error);
            }
        }

        return null;
    }

    /**
     * Process a single question node and extract all relevant data
     * @param {Element} node The question DOM node
     * @returns {Promise<Object>} Returns an object with the following structure:
     * @property {Object} elements - Raw DOM elements for direct manipulation
     * @property {Element} elements.questionElement - The DOM element containing the question text
     * @property {Element[]} elements.answerElements - Array of DOM elements for answers (inputs, options)
     * @property {Element} elements.parentNode - The container element of the entire question
     * 
     * @property {Object} data - Processed data from the DOM elements
     * @property {string} data.question - The extracted question text
     * @property {string} data.type - Type of question/answer ('text'|'radio'|'checkbox'|'select')
     * @property {Object[]} data.answers - Array of processed answer data
     * @property {string} data.answers[].type - The type of this answer
     * @property {string} data.answers[].text - The text content of the answer
     * @property {string} data.answers[].value - The value attribute of the answer element
     * @property {Element} data.answers[].element - Reference to the answer's DOM element
     * 
     * @property {Object[]} data.images - Array of images found in the question
     * @property {Element} data.images[].element - The img DOM element
     * @property {string} data.images[].src - Image source URL
     * @property {string} data.images[].alt - Image alt text
     * @property {string} data.images[].title - Image title attribute
     * 
     * @property {boolean} success - Whether the question was processed successfully
     * 
     * Example:
     * {
     *   elements: {
     *     questionElement: <div class="qtext">What is ...?</div>,
     *     answerElements: [<input type="radio">, <input type="radio">],
     *     parentNode: <div class="question">...</div>
     *   },
     *   data: {
     *     question: "What is the capital of France?",
     *     type: "radio",
     *     answers: [{
     *       type: "radio",
     *       text: "Paris",
     *       value: "1",
     *       element: <input type="radio" value="1">
     *     }],
     *     images: [{
     *       element: <img src="map.jpg">,
     *       src: "map.jpg",
     *       alt: "Map of France",
     *       title: "French map"
     *     }]
     *   },
     *   success: true
     * }
     */
    async getQuestionPromiseForSingleQuestion(node) {
        try {
            // Find question text element
            const qtextNode = node.querySelector(this.selectors.questionNode.qtext) || 
                            node.querySelector(this.selectors.questionNode.subquestion) ||
                            node.querySelector(this.selectors.questionNode.content);
            
            if (!qtextNode) {
                throw new Error('Question text not found');
            }

            // Get answer type and elements
            const answerType = await this.getAnswerType(node);
            const answerElements = await this.getAnswerElementsByType(node, answerType);

            // Get images
            const images = Array.from(qtextNode.querySelectorAll('img')).map(img => ({
                element: img,
                src: img.src,
                alt: img.alt || '',
                title: img.title || ''
            }));

            return {
                elements: {
                    questionElement: qtextNode,
                    answerElements: answerElements,
                    parentNode: node
                },
                data: {
                    question: qtextNode.textContent.trim(),
                    type: answerType,
                    answers: answerElements.map(el => ({
                        type: answerType,
                        text: this.findAnswerText(el),
                        value: el.value || '',
                        element: el
                    })),
                    images: images
                },
                success: true
            };

        } catch (error) {
            console.log('Could not process question node:', node, error);
            console.error('Error processing question:', error);
            return { success: false };
        }
    }

    /**
     * Makes text content from array of elements
     * @param {Array} elements Array of text/image elements
     * @returns {string} Combined text content
     */
    makeTextFromElements(elements) {
        return elements.reduce((acc, item) => {
            if (!item.val || item.val.trim() === '') {
                return acc;
            }
            if (item.type === 'img') {
                acc.push(`[${item.val}]`);
            } else {
                acc.push(item.val);
            }
            return acc;
        }, []).join(' ').trim();
    }

    /**
     * Felismeri a kérdés típusát a DOM elemek alapján
     * @param {Element} node - A kérdést tartalmazó DOM node
     * @returns {Promise<string>} A kérdés típusa
     */
    async getAnswerType(node) {
        const textAnswers = node.querySelectorAll(this.selectors.questionNode.textAnswer);
        const multipleChoice = node.querySelectorAll(this.selectors.questionNode.multipleChoice);
        const checkboxes = node.querySelectorAll(this.selectors.questionNode.checkbox);
        const select = node.querySelector(this.selectors.questionNode.select);

        // Ha több text input mező van, akkor MULTIPLE_TEXT típust adunk vissza
        if (textAnswers.length > 1) return AnswerType.MULTIPLE_TEXT;
        if (textAnswers.length === 1) return AnswerType.TEXT;
        if (multipleChoice.length > 0) return AnswerType.RADIO;
        if (checkboxes.length > 0) return AnswerType.CHECKBOX;
        if (select) return AnswerType.SELECT;
        return 'unknown';
    }

    /**
     * Gets the raw DOM elements for answers based on question type
     * @param {Element} node - The question container node
     * @param {string} type - Answer type (text, radio, checkbox, select)
     * @returns {Promise<Array<Element>>} Array of answer DOM elements
     */
    async getAnswerElementsByType(node, type) {
        switch(type) {
            case AnswerType.MULTIPLE_TEXT:
                // Több text input mező esetén az összeset visszaadjuk
                const multipleTextInputs = node.querySelectorAll(this.selectors.questionNode.textAnswer);
                return Array.from(multipleTextInputs);

            case AnswerType.TEXT:
                const textInput = node.querySelector(this.selectors.questionNode.textAnswer);
                return textInput ? [textInput] : [];

            case AnswerType.RADIO:
            case AnswerType.CHECKBOX:

                const selector = type === AnswerType.RADIO ? 
                    this.selectors.questionNode.multipleChoice : 
                    this.selectors.questionNode.checkbox;
                return Array.from(node.querySelectorAll(
                    `${this.selectors.questionNode.answerContainer} ${selector}`
                ));

            case AnswerType.SELECT:
                const select = node.querySelector(this.selectors.questionNode.select);
                return select ? [select] : [];

            default:
                return [];
        }
    }

    /**
     * Megkeresi egy input elem melletti szöveget
     * @param {Element} element - Az input elem
     * @returns {string} A talált szöveg
     */
    findAnswerText(element) {
        try {
            // 0. Moodle often uses aria-labelledby to tie inputs to a text container
            const aria = element.getAttribute && element.getAttribute('aria-labelledby');
            if (aria) {
                const ids = aria.split(/\s+/).filter(Boolean);
                const parts = ids.map(id => document.getElementById(id))
                    .filter(el => !!el)
                    .map(el => el.textContent.trim())
                    .filter(t => t.length > 0);
                if (parts.length > 0) {
                    return parts.join(' ').replace(/\s+/g, ' ').trim();
                }
            }

            // 1. Próbáljuk meg megtalálni a hozzá tartozó label elemet az ID alapján
            if (element.id) {
                const associatedLabel = document.querySelector(`label[for="${element.id}"]`);
                if (associatedLabel) {
                    return associatedLabel.textContent.trim();
                }
            }

            // 2. Ellenőrizzük, hogy az input egy label-en belül van-e
            const parentLabel = element.closest('label');
            if (parentLabel) {
                // Klónozzuk a label-t és távolítsuk el belőle az input-ot
                const clone = parentLabel.cloneNode(true);
                const inputs = clone.querySelectorAll('input');
                inputs.forEach(input => input.remove());
                return clone.textContent.trim();
            }

            // 3. Keressünk testvér elemet, ami label vagy tartalmazza a szöveget
            const siblings = Array.from(element.parentElement.children);
            for (const sibling of siblings) {
                if (sibling !== element && sibling.tagName === 'LABEL') {
                    return sibling.textContent.trim();
                }
            }

            // 4. Keressük a legközelebbi szöveges tartalmat
            let parent = element.parentElement;
            while (parent) {
                // Csak a közvetlen szöveg node-okat nézzük
                const textNodes = Array.from(parent.childNodes)
                    .filter(node => node.nodeType === 3)
                    .map(node => node.textContent.trim())
                    .filter(text => text.length > 0);

                if (textNodes.length > 0) {
                    return textNodes.join(' ');
                }

                // Ha van .ml-1 osztályú elem (Moodle specifikus), azt is nézzük meg
                const ml1Element = parent.querySelector('.ml-1');
                if (ml1Element) {
                    return ml1Element.textContent.trim();
                }

                parent = parent.parentElement;
            }

            console.warn('Could not find answer text for element:', element);
            return 'Unknown answer';
        } catch (error) {
            console.error('Error finding answer text:', error);
            return 'Error finding answer text';
        }
    }


    applyModificationsToQuestion(questionData) {
        if (!questionData || !questionData.success) {
            console.warn('Invalid question data, cannot apply modifications');
            return;
        }

        if (questionData.data.type === AnswerType.SELECT) {
            console.warn('Select question type modification not implemented yet');
            return;
        }

        // Debug log to see the structure
        console.log('Question Data Structure:', {
            elements: questionData.elements,
            data: questionData.data
        });

        if (questionData.elements && questionData.elements.questionElement) {
            // Add click event listener to the question element
            questionData.elements.questionElement.addEventListener('click', async () => {
                try {
                    if (this.isRequestInFlight) {
                        console.warn('A request is already in progress. Please wait.');
                        return;
                    }
                    this.isRequestInFlight = true;
                    this.setQuestionBusy(questionData.elements.parentNode, true);
                    console.log('Question clicked:', questionData.data.question);
                    
                    // Prepare options for askGPT
                    const askGPTOptions = {};
                    if (questionData.data.type === AnswerType.MULTIPLE_TEXT) {
                        askGPTOptions.answerFieldsCount = questionData.elements.answerElements.length;
                    }
                    
                    const gptResponse = await gptManager.askGPT(
                        questionData.data.question,
                        questionData.data.type === AnswerType.MULTIPLE_TEXT ? [] : questionData.data.answers.map(ans => ans.text),
                        questionData.data.type,
                        askGPTOptions
                    );
                    console.log('GPT Response:', gptResponse);

                    // Copy results to clipboard immediately if enabled in config
                    try {
                        const cfg = configStore.getConfig();
                        if (cfg && cfg.copyResoults) {
                            const toCopy = this.formatAnswersValuesOnly(questionData, gptResponse);
                            if (toCopy) {
                                await this.copyToClipboard(toCopy);
                                console.debug('Answers copied to clipboard.');
                            }
                        }
                    } catch (e) {
                        console.warn('Failed to copy answers to clipboard:', e);
                    }

                    const elems = questionData.elements.answerElements || [];
                    const answersData = questionData.data.answers || [];
                    const toIndex = (ans) => {
                        // Convert a single answer (number or text) to index within this question
                        if (ans === null || ans === undefined) return -1;
                        // number-like
                        if (!isNaN(ans)) {
                            const idx = parseInt(ans, 10);
                            return (idx >= 0 && idx < elems.length) ? idx : -1;
                        }
                        // text match (case-insensitive)
                        const lower = String(ans).trim().toLowerCase();
                        return answersData.findIndex(a => String(a.text || '').trim().toLowerCase() === lower);
                    };

                    switch (questionData.data.type) {
                        case AnswerType.MULTIPLE_TEXT:
                            // Több text input mező esetén
                            try {
                                let multipleTextAnswers = [];
                                
                                // Null-safe answer extraction
                                if (gptResponse && Array.isArray(gptResponse.correctAnswers)) {
                                    multipleTextAnswers = gptResponse.correctAnswers;
                                } else if (gptResponse && typeof gptResponse.correctAnswers === 'string') {
                                    // Ha string-ként jött, próbáljuk array-re alakítani
                                    multipleTextAnswers = [gptResponse.correctAnswers];
                                } else if (gptResponse && gptResponse.answer) {
                                    multipleTextAnswers = Array.isArray(gptResponse.answer) 
                                        ? gptResponse.answer 
                                        : [gptResponse.answer];
                                } else {
                                    console.warn('No valid answers in GPT response for MULTIPLE_TEXT');
                                    multipleTextAnswers = [];
                                }
                                
                                // Kitöltjük a mezőket sorban, védve az esetleges hibákat
                                questionData.elements.answerElements.forEach((element, index) => {
                                    try {
                                        if (element && multipleTextAnswers[index] !== undefined && multipleTextAnswers[index] !== null) {
                                            const answerValue = String(multipleTextAnswers[index]).trim();
                                            if (element.value !== undefined) {
                                                element.value = answerValue;
                                                // Dispatch events hogy Moodle észlelje a változást
                                                try {
                                                    element.dispatchEvent(new Event('input', { bubbles: true }));
                                                    element.dispatchEvent(new Event('change', { bubbles: true }));
                                                } catch (eventError) {
                                                    console.warn('Failed to dispatch events for field', index, eventError);
                                                }
                                            }
                                        }
                                    } catch (fieldError) {
                                        console.error('Error setting value for field', index, fieldError);
                                    }
                                });
                            } catch (error) {
                                console.error('Error processing MULTIPLE_TEXT answer:', error);
                            }
                            break;

                        case AnswerType.TEXT:
                            const textAnswer = (typeof gptResponse?.correctAnswers === 'string')
                                ? gptResponse.correctAnswers
                                : (Array.isArray(gptResponse?.correctAnswers) ? gptResponse.correctAnswers[0] : (gptResponse?.answer || ''));
                            if (questionData.elements.answerElements[0]) {
                                questionData.elements.answerElements[0].value = textAnswer;
                            }
                            break;

                        case AnswerType.RADIO:
                            // Normalize to index and check within this question only
                            const radioIdx = toIndex((gptResponse.correctAnswers || [])[0]);
                            if (radioIdx >= 0 && elems[radioIdx]) {
                                // uncheck others first to be safe
                                elems.forEach(el => { if (el.type === 'radio') el.checked = false; });
                                elems[radioIdx].checked = true;
                                elems[radioIdx].dispatchEvent(new Event('change', { bubbles: true }));
                            }
                            break;

                        case AnswerType.CHECKBOX:
                            const checkboxAnswers = Array.isArray(gptResponse.correctAnswers) ? gptResponse.correctAnswers : [];
                            const indexSet = new Set(
                                checkboxAnswers
                                    .map(a => toIndex(a))
                                    .filter(i => i >= 0 && i < elems.length)
                            );
                            // reset all, then set selected indices
                            elems.forEach((el, i) => {
                                if (el.type === 'checkbox') {
                                    el.checked = indexSet.has(i);
                                }
                            });
                            // optional: dispatch change for all toggled
                            elems.forEach((el, i) => {
                                if (el.type === 'checkbox' && indexSet.has(i)) {
                                    el.dispatchEvent(new Event('change', { bubbles: true }));
                                }
                            });
                            break;

                        default:
                            console.warn('Unhandled question type for GPT response application:', questionData.data.type);
                    }
                    // Here you can apply the GPT response to the UI as needed
                } catch (error) {
                    console.error('Error getting GPT answer:', error);
                } finally {
                    this.setQuestionBusy(questionData.elements.parentNode, false);
                    this.markQuestionCompleted(questionData.elements.parentNode);
                    this.isRequestInFlight = false;
                }
            });
            console.log('Click listener added to question:', questionData.data.question);
        } else {
            console.error('Question element not found in:', questionData);
        }
    }

    /**
     * Formats GPT response into a clipboard-friendly string.
     * @param {Object} questionData - Processed question data with answers array
     * @param {Object} gptResponse - Response object returned from gptManager.askGPT
     * @returns {string}
     */
    formatAnswersForClipboard(questionData, gptResponse) {
        try {
            const q = questionData?.data?.question || '';
            const type = questionData?.data?.type || gptResponse?.type || 'unknown';
            const answersMeta = questionData?.data?.answers || [];

            // Normalize answers to an array of strings
            let answers = [];
            if (type === AnswerType.MULTIPLE_TEXT) {
                // Több text input esetén az összes választ megjelenítjük
                let multipleAnswers = [];
                if (gptResponse && Array.isArray(gptResponse.correctAnswers)) {
                    multipleAnswers = gptResponse.correctAnswers;
                } else if (gptResponse && typeof gptResponse.correctAnswers === 'string') {
                    multipleAnswers = [gptResponse.correctAnswers];
                } else if (gptResponse && gptResponse.answer) {
                    multipleAnswers = Array.isArray(gptResponse.answer) ? gptResponse.answer : [gptResponse.answer];
                }
                answers = multipleAnswers.map((a, idx) => `Field ${idx + 1}: ${String(a || '').trim()}`).filter(a => a.includes(': ') && a.split(': ')[1]);
            } else if (type === AnswerType.TEXT) {
                const txt = (typeof gptResponse?.correctAnswers === 'string')
                    ? gptResponse.correctAnswers
                    : (Array.isArray(gptResponse?.correctAnswers) ? gptResponse.correctAnswers[0] : (gptResponse?.answer || ''));
                answers = [String(txt || '').trim()];
            } else {
                // For non-text, prefer correctAnswers; could be indices or texts
                const provided = Array.isArray(gptResponse?.correctAnswers)
                    ? gptResponse.correctAnswers
                    : (gptResponse?.correctAnswers != null ? [gptResponse.correctAnswers] : []);

                const toIndex = (ans) => {
                    if (ans == null) return -1;
                    if (!isNaN(ans)) {
                        const idx = parseInt(ans, 10);
                        return (idx >= 0 && idx < answersMeta.length) ? idx : -1;
                    }
                    const lower = String(ans).trim().toLowerCase();
                    return answersMeta.findIndex(a => String(a.text || '').trim().toLowerCase() === lower);
                };

                const indices = provided.map(toIndex).filter(i => i >= 0 && i < answersMeta.length);
                if (indices.length > 0) {
                    answers = indices.map(i => String(answersMeta[i]?.text || '').trim());
                } else {
                    // Fall back to stringifying provided answers
                    answers = provided.map(a => String(a));
                }
            }

            const header = `Question: ${q}`;
            const typeLine = `Type: ${type}`;
            const lines = answers.length ? answers : ['<no answer>'];
            return [header, typeLine, 'Answers:', ...lines].join('\n');
        } catch (e) {
            try {
                return String(gptResponse?.answer || gptResponse?.correctAnswers || '');
            } catch { return ''; }
        }
    }

    /**
     * Copies text to clipboard using GM_setClipboard if available, otherwise navigator.clipboard,
     * and finally a hidden textarea fallback.
     * @param {string} text
     */
    async copyToClipboard(text) {
        if (!text) return;
        try {
            if (typeof GM_setClipboard === 'function') {
                GM_setClipboard(text, 'text');
                return;
            }
        } catch {}

        if (navigator.clipboard && navigator.clipboard.writeText) {
            try {
                await navigator.clipboard.writeText(text);
                return;
            } catch {}
        }

        // Fallback: hidden textarea
        try {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            ta.style.pointerEvents = 'none';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.focus();
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        } catch (e) {
            console.warn('Clipboard fallback failed:', e);
        }
    }

    /**
     * Returns only the answer value(s) as a string for clipboard.
     * - TEXT: single line (answer)
     * - MULTIPLE_TEXT: newline separated answers
     * - RADIO: single line (selected answer text)
     * - CHECKBOX/SELECT: newline separated or comma separated list
     */
    formatAnswersValuesOnly(questionData, gptResponse) {
        const type = questionData?.data?.type || gptResponse?.type || 'unknown';
        const answersMeta = questionData?.data?.answers || [];

        if (type === AnswerType.MULTIPLE_TEXT) {
            let multipleAnswers = [];
            if (gptResponse && Array.isArray(gptResponse.correctAnswers)) {
                multipleAnswers = gptResponse.correctAnswers;
            } else if (gptResponse && typeof gptResponse.correctAnswers === 'string') {
                multipleAnswers = [gptResponse.correctAnswers];
            } else if (gptResponse && gptResponse.answer) {
                multipleAnswers = Array.isArray(gptResponse.answer) ? gptResponse.answer : [gptResponse.answer];
            }
            return multipleAnswers.map(a => String(a || '').trim()).filter(Boolean).join('\n');
        }

        if (type === AnswerType.TEXT) {
            const txt = (typeof gptResponse?.correctAnswers === 'string')
                ? gptResponse.correctAnswers
                : (Array.isArray(gptResponse?.correctAnswers) ? gptResponse.correctAnswers[0] : (gptResponse?.answer || ''));
            return String(txt || '').trim();
        }

        const provided = Array.isArray(gptResponse?.correctAnswers)
            ? gptResponse.correctAnswers
            : (gptResponse?.correctAnswers != null ? [gptResponse.correctAnswers] : []);

        const toIndex = (ans) => {
            if (ans == null) return -1;
            if (!isNaN(ans)) {
                const idx = parseInt(ans, 10);
                return (idx >= 0 && idx < answersMeta.length) ? idx : -1;
            }
            const lower = String(ans).trim().toLowerCase();
            return answersMeta.findIndex(a => String(a.text || '').trim().toLowerCase() === lower);
        };

        const indices = provided.map(toIndex).filter(i => i >= 0 && i < answersMeta.length);
        if (indices.length > 0) {
            const values = indices.map(i => String(answersMeta[i]?.text || '').trim()).filter(Boolean);
            return values.join(type === AnswerType.CHECKBOX || type === AnswerType.SELECT ? '\n' : ', ');
        }

        // Fallback to provided as strings
        const str = provided.map(a => String(a)).filter(Boolean).join('\n');
        return str || '';
    }

    /**
     * Adds/removes a subtle busy indicator on the question node.
     */
    setQuestionBusy(questionNode, busy) {
        if (!questionNode) return;
        try {
            questionNode.classList.toggle('mgpt-busy', !!busy);
            if (busy) {
                if (!document.getElementById('mgpt-style')) {
                    const s = document.createElement('style');
                    s.id = 'mgpt-style';
                    s.textContent = `
                        /* Subtle visual feedback */
                        .mgpt-busy { outline: 1px dashed rgba(136,136,136,0.28); outline-offset: 1px; }
                        .mgpt-done { outline: 1px solid rgba(46,204,113,0.35); outline-offset: 1px; animation: mgptPulse 0.6s ease-out 1; }
                        @keyframes mgptPulse { from { box-shadow: 0 0 0 0 rgba(46,204,113,0.18); } to { box-shadow: 0 0 0 4px rgba(46,204,113,0); } }
                    `;
                    document.head.appendChild(s);
                }
            }
        } catch {}
    }

    /**
     * Marks a question as completed briefly.
     */
    markQuestionCompleted(questionNode) {
        if (!questionNode) return;
        try {
            questionNode.classList.remove('mgpt-busy');
            questionNode.classList.add('mgpt-done');
            setTimeout(() => questionNode.classList.remove('mgpt-done'), 1400);
        } catch {}
    }
}


// Export singleton instance
const questionSolver = new QuestionSolver();
module.exports = questionSolver;
