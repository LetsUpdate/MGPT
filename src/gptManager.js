// GPT Manager for handling GPT interactions and configurations
const configStore = require('./configStore');
const scriptConfig = require('./config');

// Answer type enum
const AnswerType = {
    CHECKBOX: 'checkbox',
    RADIO: 'radio',
    TEXT: 'text',
    SELECT: 'select'
};

// Global GPT manager instance
let gptManagerInstance = null;

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
            GM_xmlhttpRequest({
                method: 'POST',
                url: scriptConfig.API_URL,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`
                },
                data: JSON.stringify({
                    model: config.model,
                    messages: [
                        { 
                            role: "system", 
                            content: scriptConfig.SYSTEM_PROMPT + `\nCurrent question type: [${answerType.toUpperCase()}]`
                        },
                        { 
                            role: "user", 
                            content: fullPrompt 
                        }
                    ],
                    temperature: config.temperature || 0.7,
                    max_tokens: config.maxTokens || 2000,
                    ...options
                }),
                onload: (response) => {
                    try {
                        if (response.status !== 200) {
                            throw new Error('HTTP error! status: ' + response.status);
                        }

                        const data = JSON.parse(response.responseText);
                        const answer = data.choices[0].message.content;
                        
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

// Export singleton instance
const gptManager = new GPTManager();
module.exports = gptManager;
