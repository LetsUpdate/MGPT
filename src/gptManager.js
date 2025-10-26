// GPT Manager for handling GPT interactions and configurations
const configStore = require('./configStore');
const scriptConfig = require('./config');


// Global GPT manager instance
let gptManagerInstance = null;

// Answer type enum
const AnswerType = {
    CHECKBOX: 'checkbox',
    RADIO: 'radio',
    TEXT: 'text',
    SELECT: 'select'
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
     * @param {AnswerType} answerType - Type of answer expected (RADIO, CHECKBOX, SELECT, or TEXT)
     * @param {Object} options - Additional options for the request
     * @returns {Promise<Object>} The GPT response
     */
    async askGPT(question, possibleAnswer = [], answerType = AnswerType.TEXT, options = {}) {
        if (!this.initialized) {
            await this.init();
        }

        const config = configStore.getConfig();
        if (!config.apiKey) {
            throw new Error('GPT API key not configured');
        }

        // Validate answer type
        if (!Object.values(AnswerType).includes(answerType)) {
            throw new Error('Invalid answer type. Must be one of: ' + Object.values(AnswerType).join(', '));
        }

        // Validate possible answers for non-text types
        if (answerType !== AnswerType.TEXT && (!possibleAnswer || possibleAnswer.length === 0)) {
            throw new Error('Possible answers must be provided for non-text answer types');
        }

        // Construct the prompt with question type, question and possible answers
        let fullPrompt = `Question Type: [${answerType.toUpperCase()}]\n\n${question}`;
        
        // Add answer format instruction based on type
        const typeInstructions = {
            [AnswerType.RADIO]: "Please select exactly ONE correct answer.",
            [AnswerType.CHECKBOX]: "Select ALL correct answers.",
            [AnswerType.SELECT]: "Select ALL applicable answers.",
            [AnswerType.TEXT]: "Provide a concise text answer."
        };
        
        fullPrompt += `\n\nInstruction: ${typeInstructions[answerType]}`;
        
        if (possibleAnswer && possibleAnswer.length > 0) {
            fullPrompt += "\n\nPossible answers:\n" + 
                possibleAnswer.map((ans, idx) => `${idx + 1}. ${ans}`).join('\n');
        }

        return new Promise((resolve, reject) => {
// config based on model

            // Clean up options by removing any message/prompt fields the caller may have passed
            const cleanOptions = { ...options };
            delete cleanOptions.messages;
            delete cleanOptions.prompt;

            // Decide whether to send 'messages' (chat completions endpoint) or 'prompt' (completion-like endpoints).
            // The configured API URL in `scriptConfig.API_URL` usually indicates which format is expected.
            const useMessages = typeof scriptConfig.API_URL === 'string' && scriptConfig.API_URL.includes('/chat');

            // Build request body depending on endpoint expectations, not only on model name
            let requestBody = { model: config.model };

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
                // Merge any remaining clean options
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
                url: scriptConfig.API_URL,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`
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
                                    // Ensure all answers are from the possible answers list
                                    parsedAnswer.correctAnswers = parsedAnswer.correctAnswers.filter(
                                        ans => possibleAnswer.includes(ans)
                                    );
                                    
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
