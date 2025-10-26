// Question Solver Module
//const gptManager = require('./gptManager');
const {gptManager, AnswerType} = require('./gptManager');


class QuestionSolver {
    constructor() {

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
        const textAnswer = node.querySelector(this.selectors.questionNode.textAnswer);
        const multipleChoice = node.querySelectorAll(this.selectors.questionNode.multipleChoice);
        const checkboxes = node.querySelectorAll(this.selectors.questionNode.checkbox);
        const select = node.querySelector(this.selectors.questionNode.select);

        if (textAnswer) return AnswerType.TEXT;
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
                    console.log('Question clicked:', questionData.data.question);
                    const gptResponse = await gptManager.askGPT(
                        questionData.data.question,
                        questionData.data.answers.map(ans => ans.text),
                        questionData.data.type
                    );
                    console.log('GPT Response:', gptResponse);

                    switch (questionData.data.type) {
                        case AnswerType.TEXT:
                            const textAnswer = gptResponse.correctAnswers || '';
                            if (questionData.elements.answerElements[0]) {
                                questionData.elements.answerElements[0].value = textAnswer;
                            }
                            break;

                        case AnswerType.RADIO:
                            const radioAnswer = gptResponse.correctAnswers[0] || '';
                            
                            questionData.data.answers.forEach(ans => {
                                //if radioanwser is a number index
                                if (!isNaN(radioAnswer)) {
                                    const index = parseInt(radioAnswer, 10);
                                    if (questionData.data.answers[index] && ans.text === questionData.data.answers[index].text) {
                                        ans.element.checked = true;
                                    }
                                } else
                                if (ans.text.toLowerCase() === radioAnswer.toLowerCase()) {
                                    //click on element
                                    ans.element.checked = true;
                                }
                            });
                            break;

                        case AnswerType.CHECKBOX:
                            const checkboxAnswers = gptResponse.correctAnswers || [];
                            
                            questionData.data.answers.forEach(ans => {
                                //if radioanwser is a number index
                                ans.element.checked = false; //reset first
                                if (!isNaN(checkboxAnswers[0])) {
                                    const indices = checkboxAnswers.map(a => parseInt(a, 10));
                                    if (indices.includes(questionData.data.answers.indexOf(ans))) {
                                        ans.element.checked = true;
                                    }
                                }else
                                if (checkboxAnswers.map(a => a.toLowerCase()).includes(ans.text.toLowerCase())) {
                                    ans.element.checked = true;
                                }
                            });
                            break;

                        default:
                            console.warn('Unhandled question type for GPT response application:', questionData.data.type);
                    }
                    // Here you can apply the GPT response to the UI as needed
                } catch (error) {
                    console.error('Error getting GPT answer:', error);
                }
            });
            console.log('Click listener added to question:', questionData.data.question);
        } else {
            console.error('Question element not found in:', questionData);
        }
    }
}


// Export singleton instance
const questionSolver = new QuestionSolver();
module.exports = questionSolver;
