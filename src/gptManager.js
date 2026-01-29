// GPT Manager for handling GPT interactions and configurations
const configStore = require('./configStore');
const scriptConfig = require('./config');
const SystemPromptGenerator = require('./systemPromptGenerator');
const { ChatGPTClient, ResponsesAPIClient } = require('./lib/chatgpt');
const { Logger } = require('./logger');


// Global GPT manager instance
let gptManagerInstance = null;

// Answer type enum
const AnswerType = {
    CHECKBOX: 'checkbox',
    RADIO: 'radio',
    TEXT: 'text',
    SELECT: 'select',
    MULTIPLE_TEXT: 'MULTIPLE_TEXT',
    MATCHING: 'matching'
};


class GPTManager {

    

    constructor() {
        if (gptManagerInstance) {
            return gptManagerInstance;
        }
        gptManagerInstance = this;
        this.initialized = false;
        this.chatClient = null;
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
            } else {
                // Initialize ChatGPT client with config
                this.chatClient = new ChatGPTClient({
                    apiKey: config.apiKey,
                    apiUrl: config.apiUrl,
                    model: config.model,
                    temperature: config.temperature,
                    maxTokens: config.maxTokens
                });
                this.initialized = true;
            }
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

        // Validate possible answers for non-text types (except MATCHING which uses matchingPairs in options)
        if (answerType !== AnswerType.TEXT && 
            answerType !== 'MULTIPLE_TEXT' && 
            answerType !== AnswerType.MATCHING && 
            (!possibleAnswer || possibleAnswer.length === 0)) {
            throw new Error('Possible answers must be provided for non-text answer types');
        }
        
        // Validate answerFieldsCount for MULTIPLE_TEXT
        if (answerType === 'MULTIPLE_TEXT' && answerFieldsCount < 1) {
            console.warn('MULTIPLE_TEXT requires answerFieldsCount >= 1, defaulting to 1');
        }

        // ====== RESPONSES API INTEGRATION ======
        // Check if Responses API is enabled and configured
        if (config.useResponsesAPI && config.assistantId) {
            Logger.logQuizQuestion(question, answerType, true);
            Logger.logContextVerification(true, config.uploadedFiles?.length || 0, config.assistantId);
            
            try {
                return await this._askWithResponsesAPI(question, possibleAnswer, answerType, answerFieldsCount, config);
            } catch (error) {
                Logger.error('QUIZ', 'Responses API failed, falling back to standard API', error);
                // Fall through to standard API on error
            }
        } else {
            Logger.logQuizQuestion(question, answerType, false);
        }
        // ====== END RESPONSES API INTEGRATION ======

        // Construct prompt with question and optional context
        let fullPrompt = question;
        
        // Add short answer instruction for TEXT/MULTIPLE_TEXT types
        if ((answerType === AnswerType.TEXT || answerType === AnswerType.MULTIPLE_TEXT) && config.shortAnswerMode) {
            fullPrompt += `\n\n⚠️ IMPORTANT: Keep your answer(s) EXTREMELY SHORT and CONCISE. Use minimal words, abbreviations where possible, no explanations. Maximum 3-5 words per answer.`;
        }
        
        // Add options for matching or multiple choice questions
        if (answerType === AnswerType.MATCHING && options.matchingPairs) {
            fullPrompt += "\n\nMatching pairs to complete:";
            options.matchingPairs.forEach((pair, index) => {
                fullPrompt += `\n${index + 1}. "${pair.label}" -> `;
                fullPrompt += "\n   Options: " + pair.options.map(opt => `${opt.value}. ${opt.text}`).join(' | ');
            });
        } else if (possibleAnswer && possibleAnswer.length > 0) {
            fullPrompt += "\n\nPossible answers:\n" + 
                possibleAnswer.map((ans, idx) => `${idx}. ${ans}`).join('\n');
        }
        
        console.log('Full Prompt Sent to GPT:', fullPrompt);

        return new Promise((resolve, reject) => {
// config based on model

            // Clean up options by removing any message/prompt fields the caller may have passed
            const cleanOptions = { ...options };
            delete cleanOptions.messages;
            delete cleanOptions.prompt;
            // Also remove custom options that shouldn't be sent to the API
            delete cleanOptions.answerFieldsCount;
            delete cleanOptions.matchingPairs;
            
            // Extract optional overrides
            const apiKeyOverride = options.apiKey;
            const apiUrlOverride = options.apiUrl;
            const modelOverride = options.model;

            // Build dynamic system prompt based on question type using the generator
            const dynamicSystemPrompt = SystemPromptGenerator.generate(answerType, answerFieldsCount);

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
                const modelDisallowsSystem = /mini|^o1|^o3/.test(modelName);

                if (modelDisallowsSystem) {
                    requestBody.messages = [
                        {
                            role: 'user',
                            content: dynamicSystemPrompt + '\n\n' + fullPrompt
                        }
                    ];
                } else {
                    requestBody.messages = [
                        {
                            role: 'system',
                            content: dynamicSystemPrompt
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
                    prompt: dynamicSystemPrompt + '\n\n' + fullPrompt,
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
                        content: dynamicSystemPrompt
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
                        
                        // Extract thinking/reasoning content for thinking models (o1, o1-mini, o3)
                        const thinking = data.choices && data.choices[0] && data.choices[0].message
                            ? (data.choices[0].message.reasoning_content || null)
                            : null;
                        
                        // Log thinking process if available
                        if (thinking) {
                            Logger.info('THINKING', `Model reasoning process: ${thinking.substring(0, 500)}${thinking.length > 500 ? '...' : ''}`);
                            Logger.debug('THINKING', `Full thinking process length: ${thinking.length} characters`);
                        }
                        
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
     * Ask GPT using Responses API (Assistants)
     * @private
     */
    async _askWithResponsesAPI(question, possibleAnswer, answerType, answerFieldsCount, config) {
        Logger.info('RESPONSES_API', 'Starting Responses API request');
        
        try {
            // Initialize Responses API client
            const responsesClient = new ResponsesAPIClient({
                apiKey: config.apiKey,
                model: config.model
            });
            
            responsesClient.assistantId = config.assistantId;
            responsesClient.threadId = config.threadId;
            
            // Build the question with context
            let fullQuestion = question;
            
            // Add short answer instruction
            if ((answerType === AnswerType.TEXT || answerType === AnswerType.MULTIPLE_TEXT) && config.shortAnswerMode) {
                fullQuestion += `\n\n⚠️ IMPORTANT: Keep your answer(s) EXTREMELY SHORT and CONCISE. Use minimal words, abbreviations where possible, no explanations. Maximum 3-5 words per answer.`;
            }
            
            // Add possible answers
            if (possibleAnswer && possibleAnswer.length > 0) {
                fullQuestion += "\n\nPossible answers:\n" + 
                    possibleAnswer.map((ans, idx) => `${idx}. ${ans}`).join('\n');
            }
            
            // Add format instructions based on answer type
            // Note: The assistant already has BASE_PROMPT in its instructions
            // We only need to add the question-type specific instructions here
            const typeInstructions = SystemPromptGenerator.generateTypeInstructions(answerType, answerFieldsCount);
            fullQuestion += `\n\n${typeInstructions}`;
            
            Logger.debug('RESPONSES_API', 'Sending message to assistant', {
                assistantId: config.assistantId,
                threadId: config.threadId,
                questionLength: fullQuestion.length
            });
            
            // Send message
            Logger.logAPIRequest('RESPONSES_API', '/threads/messages', 'POST');
            const result = await responsesClient.sendMessage({
                message: fullQuestion,
                includeThinking: true // Enable thinking for better debugging
            });
            Logger.logAPIResponse('RESPONSES_API', '/threads/messages', 200);
            
            // Save thread ID for next question
            if (responsesClient.threadId !== config.threadId) {
                configStore.update({ threadId: responsesClient.threadId });
                Logger.debug('RESPONSES_API', 'Thread ID updated', { threadId: responsesClient.threadId });
            }
            
            Logger.info('RESPONSES_API', 'Response received', {
                contentLength: result.content?.length || 0,
                hasThinking: !!result.thinking
            });
            
            if (result.thinking) {
                Logger.debug('RESPONSES_API', 'Thinking process', { thinking: result.thinking });
            }
            
            // Log annotations (file citations) if present
            if (result.annotations && result.annotations.length > 0) {
                Logger.debug('RESPONSES_API', `Annotations found: ${result.annotations.length}`);
                result.annotations.forEach((ann, idx) => {
                    Logger.debug('RESPONSES_API', `Annotation ${idx + 1}: ${JSON.stringify({type: ann.type, file_id: ann.file_id})}`);
                });
                
                // Log file usage for verification
                const fileCitations = result.annotations.filter(a => a.type === 'file_citation');
                if (fileCitations.length > 0) {
                    Logger.info('FILE_USAGE', `✅ Files were consulted! Count: ${fileCitations.length}`);
                    fileCitations.forEach((citation, idx) => {
                        const quote = citation.quote ? citation.quote.substring(0, 100) : citation.text.substring(0, 100);
                        Logger.info('FILE_USAGE', `Citation ${idx + 1}: File ${citation.file_id} quoted: "${quote}..."`);
                    });
                    Logger.info('FILE_USAGE', `Total citations found: ${fileCitations.length}`);
                } else {
                    Logger.warn('FILE_USAGE', '⚠️ NO files were consulted in this response');
                    Logger.warn('FILE_USAGE', 'Possible reasons:\n  - Question answerable without file context\n  - Files don\'t contain relevant information\n  - Assistant didn\'t find useful content');
                }
            } else {
                Logger.debug('RESPONSES_API', 'No annotations found in response');
                Logger.warn('FILE_USAGE', '⚠️ NO files were consulted in this response');
                Logger.warn('FILE_USAGE', 'Possible reasons:\n  - Question answerable without file context\n  - Files don\'t contain relevant information\n  - Assistant didn\'t find useful content');
            }
            
            // Parse the response based on answer type
            return this._parseResponseForType(result.content, answerType, possibleAnswer, answerFieldsCount);
            
        } catch (error) {
            Logger.error('RESPONSES_API', 'Request failed', error);
            throw error;
        }
    }

    /**
     * Parse response based on answer type
     * @private
     */
    _parseResponseForType(content, answerType, possibleAnswer, answerFieldsCount) {
        Logger.debug('PARSING', `Parsing response for type: ${answerType}`);
        
        try {
            // Try to parse as JSON first
            const parsed = JSON.parse(content);
            Logger.info('PARSING', 'Successfully parsed JSON response', parsed);
            return parsed;
        } catch (e) {
            // If not JSON, try to extract answer from text
            Logger.debug('PARSING', 'Response is not JSON, parsing as text');
            
            if (answerType === AnswerType.CHECKBOX || answerType === AnswerType.SELECT) {
                // Extract array of answers
                const matches = content.match(/\d+/g);
                if (matches) {
                    const indices = matches.map(m => parseInt(m));
                    const answers = indices.map(idx => possibleAnswer[idx]).filter(Boolean);
                    Logger.info('PARSING', 'Extracted checkbox/select answers', answers);
                    return { type: answerType, correctAnswers: answers };
                }
            } else if (answerType === AnswerType.RADIO) {
                // Extract single answer - try index first, then text matching
                const match = content.match(/\d+/);
                if (match) {
                    const idx = parseInt(match[0]);
                    if (idx >= 0 && idx < possibleAnswer.length) {
                        const answer = possibleAnswer[idx];
                        Logger.info('PARSING', 'Extracted radio answer by index', answer);
                        return { type: answerType, correctAnswers: [answer] };
                    }
                }
                
                // If no index found, try to match answer text directly
                const trimmedContent = content.trim();
                const matchingAnswer = possibleAnswer.find(ans => 
                    ans.toLowerCase().includes(trimmedContent.toLowerCase()) || 
                    trimmedContent.toLowerCase().includes(ans.toLowerCase())
                );
                
                if (matchingAnswer) {
                    Logger.info('PARSING', 'Extracted radio answer by text match', matchingAnswer);
                    return { type: answerType, correctAnswers: [matchingAnswer] };
                }
                
                // Fallback: return the raw text in correctAnswers array
                Logger.warn('PARSING', 'Could not match radio answer, returning raw text', trimmedContent);
                return { type: answerType, correctAnswers: [trimmedContent] };
            }
            
            // Default: return as text
            Logger.info('PARSING', 'Returning as text answer');
            return { type: answerType, answer: content.trim() };
        }
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
