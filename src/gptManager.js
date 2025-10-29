// GPT Manager for handling GPT interactions and configurations
const configStore = require('./configStore');
const scriptConfig = require('./config');
const ragClient = require('./ragClient');


// Global GPT manager instance
let gptManagerInstance = null;

// Answer type enum
const AnswerType = {
    CHECKBOX: 'checkbox',
    RADIO: 'radio',
    TEXT: 'text',
    SELECT: 'select',
    MULTIPLE_TEXT: 'MULTIPLE_TEXT'
};


class GPTManager {

    

    constructor() {
        if (gptManagerInstance) {
            return gptManagerInstance;
        }
        gptManagerInstance = this;
        this.initialized = false;
    }

    /**
     * Optionally rewrites a question into a short, RAG-friendly query.
     * Falls back to original on error.
     */
    async rewriteQuery(originalQuestion, cfg) {
        try {
            const maxChars = Math.max(40, Number(cfg.ragQueryMaxChars || 160));
            const instruction = `Rewrite the following question into a concise search query optimised for semantic retrieval.\n` +
                `- Keep it under ${maxChars} characters.\n` +
                `- Use the primary language of the question.\n` +
                `- Preserve key entities, numbers, and constraints.\n` +
                `- Output ONLY the single-line query, with no quotes or extra text.`;

            const prompt = `${instruction}\n\nQuestion:\n${originalQuestion}`;
            const text = await this._sendMinimal(prompt, cfg, { max_tokens: 64, temperature: 0.2 });
            const oneline = String((text || '').split('\n')[0]).trim();
            if (!oneline) return originalQuestion;
            // Hard truncate to maxChars just in case
            return oneline.length > maxChars ? oneline.slice(0, maxChars) : oneline;
        } catch (e) {
            console.warn('rewriteQuery failed, using original question:', e?.message || e);
            return originalQuestion;
        }
    }

    /**
     * Sends a minimal text request to the configured endpoint and returns raw text content.
     * This bypasses RAG and the answer-type handling.
     */
    async _sendMinimal(userContent, cfg, opts = {}) {
        const endpointUrl = (cfg.apiUrl || scriptConfig.API_URL);
        const model = "gpt-4o"//cfg.model;
        const apiKey = cfg.apiKey;
        const useMessages = typeof endpointUrl === 'string' && endpointUrl.includes('/chat');

        const baseBody = { model };
        let requestBody;
        if (useMessages) {
            // Avoid system for mini models; send as a single user message
            const modelName = String(model || '').toLowerCase();
            const modelDisallowsSystem = /mini|^o1|^o4/.test(modelName);
            if (modelDisallowsSystem) {
                requestBody = { ...baseBody, messages: [{ role: 'user', content: userContent }], ...opts };
            } else {
                requestBody = { ...baseBody, messages: [
                    { role: 'system', content: 'You rewrite queries. Output only the final rewritten query.' },
                    { role: 'user', content: userContent }
                ], ...opts };
            }
        } else {
            requestBody = { ...baseBody, prompt: userContent, max_tokens: 80, temperature: 0.2, ...opts };
        }

        const payload = JSON.stringify(requestBody);
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: endpointUrl,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                data: payload,
                onload: (response) => {
                    try {
                        if (response.status !== 200) throw new Error('HTTP ' + response.status);
                        const body = JSON.parse(response.responseText);
                        const text = body.choices && body.choices[0] ? (body.choices[0].text || body.choices[0].message?.content || '') : '';
                        resolve(String(text || ''));
                    } catch (e) { reject(e); }
                },
                onerror: (e) => reject(e)
            });
        });
    }

    /**
     * Initializes the GPT manager
     * @returns {Promise} Resolves when initialization is complete
     */
    async init() {
        if (this.initialized) return;

        try {
            // Validate and ensure required fields
            const config = configStore.getConfig();
            if (!config.apiKey) {
                console.warn('GPT API key not set. Please configure in settings.');
            }else
                this.initialized = true;
        } catch (error) {
            console.error('Failed to initialize GPT Manager:', error);
            throw error;
        }
    }


    //todo: gpt-o1 only writes the indexes of the question, not the answers, we shoud handle that in multiple choice questions
    /**
     * Sends a question to GPT and gets the response
     * @param {string} question - The question to ask
     * @param {Array<string>} possibleAnswer - Array of possible answers for multiple choice questions
     * @param {AnswerType} answerType - Type of answer expected (RADIO, CHECKBOX, SELECT, TEXT, or MULTIPLE_TEXT)
     * @param {Object} options - Additional options for the request
     * @param {number} options.answerFieldsCount - Number of answer fields (used for MULTIPLE_TEXT type)
     * @returns {Promise<Object>} The GPT response
     */
    async askGPT(question, possibleAnswer = [], answerType = AnswerType.TEXT, options = {}) {
        if (!this.initialized) {
            await this.init();
        }

        const config = configStore.getConfig();
        if (!config.apiKey && !options.apiKey) {
            throw new Error('GPT API key not configured');
        }

        // Extract answerFieldsCount from options (backward compatible)
        const answerFieldsCount = Math.max(1, parseInt(options.answerFieldsCount || 1, 10));

        // Validate answer type
        if (!Object.values(AnswerType).includes(answerType) && answerType !== 'MULTIPLE_TEXT') {
            throw new Error('Invalid answer type. Must be one of: ' + Object.values(AnswerType).join(', ') + ', MULTIPLE_TEXT');
        }

        // Validate possible answers for non-text types
        if (answerType !== AnswerType.TEXT && answerType !== 'MULTIPLE_TEXT' && (!possibleAnswer || possibleAnswer.length === 0)) {
            throw new Error('Possible answers must be provided for non-text answer types');
        }
        
        // Validate answerFieldsCount for MULTIPLE_TEXT
        if (answerType === 'MULTIPLE_TEXT' && answerFieldsCount < 1) {
            console.warn('MULTIPLE_TEXT requires answerFieldsCount >= 1, defaulting to 1');
        }

        // Optionally retrieve RAG context
        let contextPrefix = '';
        try {
            const cfg = configStore.getConfig();
            if (cfg.ragEnabled) {
                const topK = Number(cfg.ragTopK || 5);
                let ragQueryText = question;
                if (cfg.ragQueryOptimizeEnabled) {
                    ragQueryText = await this.rewriteQuery(question, cfg);
                    if (ragQueryText && ragQueryText !== question) {
                        console.debug('RAG optimized query:', ragQueryText);
                    }
                }
                const { contexts } = await ragClient.query(ragQueryText, topK);
                if (contexts && contexts.length) {
                    const ctxText = contexts.map((c, i) => `[[Chunk ${i+1} | score=${(c.score ?? 0).toFixed(3)}]]\n${c.text}`).join('\n\n');
                    contextPrefix = `Relevant knowledge (from your local corpus):\n${ctxText}\n\n`;
                }
            }
        } catch (e) {
            console.warn('RAG retrieval failed or disabled:', e?.message || e);
        }

        // Construct the prompt with question type, question and possible answers
    let fullPrompt = `${contextPrefix}Question Type: [${answerType.toUpperCase()}]\n\n${question}`;
        
        // Add answer format instruction based on type
        const typeInstructions = {
            [AnswerType.RADIO]: "Please select exactly ONE correct answer.",
            [AnswerType.CHECKBOX]: "Select ALL correct answers.",
            [AnswerType.SELECT]: "Select ALL applicable answers.",
            [AnswerType.TEXT]: "Provide a concise text answer.",
            [AnswerType.MULTIPLE_TEXT]: `This question has ${answerFieldsCount} separate answer fields. Provide ${answerFieldsCount} separate answers in the correctAnswers array, one for each field in order.`
        };
        
        fullPrompt += `\n\nInstruction: ${typeInstructions[answerType]}`;
        
        // Add short answer instruction for TEXT/MULTIPLE_TEXT types
        if ((answerType === AnswerType.TEXT || answerType === AnswerType.MULTIPLE_TEXT) && config.shortAnswerMode) {
            fullPrompt += `\n\n⚠️ IMPORTANT: Keep your answer(s) EXTREMELY SHORT and CONCISE. Use minimal words, abbreviations where possible, no explanations. Maximum 3-5 words per answer.`;
        }
        
        if (possibleAnswer && possibleAnswer.length > 0) {
            fullPrompt += "\n\nPossible answers:\n" + 
                possibleAnswer.map((ans, idx) => `index:${idx}, ${ans}`).join('\n');
        }
        
        // MULTIPLE_TEXT esetén példa formátum megadása
        if (answerType === AnswerType.MULTIPLE_TEXT) {
            fullPrompt += `\n\nResponse format example:\n{\n  "type": "MULTIPLE_TEXT",\n  "correctAnswers": ["answer1", "answer2", "answer3", ...]\n}\nProvide exactly ${answerFieldsCount} answers in the array.`;
        }
        
        console.log('Full Prompt Sent to GPT:', fullPrompt);

        return new Promise((resolve, reject) => {
// config based on model

            // Clean up options by removing any message/prompt fields the caller may have passed
            const cleanOptions = { ...options };
            delete cleanOptions.messages;
            delete cleanOptions.prompt;
            // Extract optional overrides
            const apiKeyOverride = options.apiKey;
            const apiUrlOverride = options.apiUrl;
            const modelOverride = options.model;

            // Decide whether to send 'messages' (chat completions endpoint) or 'prompt' (completion-like endpoints).
            // The configured API URL in `scriptConfig.API_URL` usually indicates which format is expected.
            // Decide endpoint URL (prefer override -> config -> script default)
            const endpointUrl = (apiUrlOverride || config.apiUrl || scriptConfig.API_URL);
            const useMessages = typeof endpointUrl === 'string' && endpointUrl.includes('/chat');

            // Build request body depending on endpoint expectations, not only on model name
            let requestBody = { model: (modelOverride || config.model) };

            if (useMessages) {
                // Some completion-style models (for example: 'o1-mini', 'ai-mini', other '-mini' models)
                // do not support the 'system' role. Detect common mini/completion models and
                // if detected, send a single 'user' message that contains the system prompt + prompt.
                const modelName = String(config.model || '').toLowerCase();
                const modelDisallowsSystem = /mini|^o1|^o4/.test(modelName);

                if (modelDisallowsSystem) {
                    requestBody.messages = [
                        {
                            role: 'user',
                            content: scriptConfig.SYSTEM_PROMPT + `\nCurrent question type: [${answerType.toUpperCase()}]\n\n` + fullPrompt
                        }
                    ];
                } else {
                    requestBody.messages = [
                        {
                            role: 'system',
                            content: scriptConfig.SYSTEM_PROMPT + `\nCurrent question type: [${answerType.toUpperCase()}]`
                        },
                        {
                            role: 'user',
                            content: fullPrompt
                        }
                    ];
                }
                // Merge any remaining clean options (e.g., max_tokens, temperature)
                requestBody = { ...requestBody, ...cleanOptions };
            } else {
                // For non-chat endpoints (completions / responses) use a single prompt field
                requestBody = {
                    ...requestBody,
                    prompt: scriptConfig.SYSTEM_PROMPT + `\nCurrent question type: [${answerType.toUpperCase()}]\n\n` + fullPrompt,
                    max_tokens: 150,
                    temperature: 0.7,
                    ...cleanOptions
                };
            }

            // Normalize request body to match endpoint expectations.
            // If endpoint expects messages (chat) but we have a prompt, convert it.
            if (useMessages && requestBody.prompt && !requestBody.messages) {
                // Split prompt into system part and user part if possible
                requestBody.messages = [
                    {
                        role: 'system',
                        content: scriptConfig.SYSTEM_PROMPT
                    },
                    {
                        role: 'user',
                        content: requestBody.prompt
                    }
                ];
                delete requestBody.prompt;
            }

            // If endpoint expects prompt but we have messages, convert messages -> prompt
            if (!useMessages && requestBody.messages && !requestBody.prompt) {
                // Concatenate system + user message content into a single prompt
                const parts = [];
                for (const msg of requestBody.messages) {
                    if (msg.content) parts.push(msg.content);
                }
                requestBody.prompt = parts.join('\n\n');
                delete requestBody.messages;
            }

            const data = JSON.stringify(requestBody);
            
       
            
            GM_xmlhttpRequest({
                method: 'POST',
                url: endpointUrl,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKeyOverride || config.apiKey}`
                },
                data: data,
                onload: (response) => {
                    try {
                        if (response.status !== 200) {
                            throw new Error('HTTP error! status: ' + response.status +'/n'+response.response);
                        }

                        const data = JSON.parse(response.responseText);
                        const answer = data.choices && data.choices[0] ? 
                            (data.choices[0].text || data.choices[0].message?.content || '') : 
                            '';
                        
                        try {
                            // Try to parse the response as JSON
                            const parsedAnswer = JSON.parse(answer);
                            
                            // Validate the answer against possible answers if they exist
                            if (possibleAnswer && possibleAnswer.length > 0) {
                                if (parsedAnswer.correctAnswers) {
                                    // Allow the assistant to return zero-based indices (numbers) or numeric strings.
                                    // If indices are provided, map them to the possibleAnswer values.
                                    const mapped = parsedAnswer.correctAnswers.map(ans => {
                                        // numeric index (number or numeric string)
                                        if (typeof ans === 'number' || (!isNaN(ans) && ans.toString().trim() !== '')) {
                                            const idx = Number(ans);
                                            // ensure 0-based index
                                            if (Number.isInteger(idx) && idx >= 0 && idx < possibleAnswer.length) {
                                                return possibleAnswer[idx];
                                            }
                                            return null;
                                        }
                                        // otherwise treat as text and try to find exact match
                                        if (typeof ans === 'string') return ans;
                                        return null;
                                    }).filter(x => x !== null);

                                    // If mapping produced some answers, use them. Else, fall back to original filter by text.
                                    if (mapped.length > 0) {
                                        parsedAnswer.correctAnswers = mapped;
                                    } else {
                                        parsedAnswer.correctAnswers = parsedAnswer.correctAnswers.filter(
                                            ans => possibleAnswer.includes(ans)
                                        );
                                    }

                                    // For radio, ensure only one answer
                                    if (answerType === AnswerType.RADIO && parsedAnswer.correctAnswers.length > 1) {
                                        parsedAnswer.correctAnswers = [parsedAnswer.correctAnswers[0]];
                                    }

                                    // Validate answer count based on type
                                    switch (answerType) {
                                        case AnswerType.RADIO:
                                            if (parsedAnswer.correctAnswers.length !== 1) {
                                                parsedAnswer.correctAnswers = [parsedAnswer.correctAnswers[0] || possibleAnswer[0]];
                                            }
                                            break;
                                        case AnswerType.CHECKBOX:
                                        case AnswerType.SELECT:
                                            if (parsedAnswer.correctAnswers.length === 0) {
                                                parsedAnswer.correctAnswers = [possibleAnswer[0]];
                                            }
                                            break;
                                    }
                                }
                                // Ensure the type matches what was requested
                                parsedAnswer.type = answerType;
                            }
                            
                            resolve(parsedAnswer);
                        } catch {
                            // If not valid JSON, return as text answer
                            resolve({
                                type: answerType,
                                answer: answer
                            });
                        }
                    } catch (error) {
                        console.error('Error processing GPT response:', error);
                        reject(error);
                    }
                },
                onerror: (error) => {
                    console.error('Error in askGPT request:', error);
                    reject(error);
                }
            });
        });
    }

    /**
     * Updates the GPT configuration
     * @param {Object} newConfig - New configuration values
     */
    updateConfig(newConfig) {
        configStore.update(newConfig);
    }

    /**
     * Gets the current GPT configuration
     * @returns {Object} Current configuration
     */
    getConfig() {
        return configStore.getConfig();
    }

    /**
     * Adds a configuration change listener
     * @param {Function} listener - Callback function for config changes
     */
    addConfigListener(listener) {
        configStore.addListener(listener);
    }

    /**
     * Removes a configuration change listener
     * @param {Function} listener - Listener to remove
     */
    removeConfigListener(listener) {
        configStore.removeListener(listener);
    }
}

// Export singleton instance and AnswerType enum
const gptManager = new GPTManager();
module.exports = { gptManager, AnswerType };
