/**
 * ChatGPT API Client
 * Handles communication with OpenAI Chat Completions API
 * Supports both chat/completions and responses endpoints
 */

class ChatGPTClient {
    constructor(config = {}) {
        this.apiKey = config.apiKey || '';
        this.apiUrl = config.apiUrl || 'https://api.openai.com/v1/chat/completions';
        this.model = config.model || 'o1-mini';
        this.temperature = config.temperature || 0.7;
        this.maxTokens = config.maxTokens || 2000;
    }

    /**
     * Update client configuration
     */
    updateConfig(config) {
        if (config.apiKey !== undefined) this.apiKey = config.apiKey;
        if (config.apiUrl !== undefined) this.apiUrl = config.apiUrl;
        if (config.model !== undefined) this.model = config.model;
        if (config.temperature !== undefined) this.temperature = config.temperature;
        if (config.maxTokens !== undefined) this.maxTokens = config.maxTokens;
    }

    /**
     * Send a completion request to ChatGPT API
     * @param {Object} params
     * @param {string} params.systemPrompt - System prompt for the model
     * @param {string} params.userPrompt - User prompt/question
     * @param {Object} params.options - Additional API options (model, temperature, etc.)
     * @returns {Promise<Object>} API response
     */
    async sendCompletion({ systemPrompt = '', userPrompt = '', options = {} }) {
        if (!this.apiKey) {
            throw new Error('API key not configured');
        }

        const useMessages = this.apiUrl.includes('/chat');
        const model = options.model || this.model;
        const apiKey = options.apiKey || this.apiKey;
        const endpointUrl = options.apiUrl || this.apiUrl;

        // Build request body
        let requestBody = { model };

        if (useMessages) {
            // Chat completions endpoint - uses messages format
            const modelName = String(model || '').toLowerCase();
            // Some models don't support system role (o1, o3, mini variants)
            const modelDisallowsSystem = /mini|^o1|^o3/.test(modelName);

            if (modelDisallowsSystem || !systemPrompt) {
                // Combine system and user prompt for models without system role support
                const combinedPrompt = systemPrompt 
                    ? `${systemPrompt}\n\n${userPrompt}`
                    : userPrompt;
                requestBody.messages = [
                    { role: 'user', content: combinedPrompt }
                ];
            } else {
                // Standard format with system and user messages
                requestBody.messages = [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ];
            }

            // Merge additional options
            requestBody = { 
                ...requestBody, 
                ...options,
                // Remove custom options that shouldn't go to API
                apiKey: undefined,
                apiUrl: undefined
            };
        } else {
            // Completions endpoint - uses prompt format
            const combinedPrompt = systemPrompt 
                ? `${systemPrompt}\n\n${userPrompt}`
                : userPrompt;
            
            requestBody = {
                ...requestBody,
                prompt: combinedPrompt,
                max_tokens: options.max_tokens || this.maxTokens,
                temperature: options.temperature !== undefined ? options.temperature : this.temperature,
                ...options,
                // Remove custom options
                apiKey: undefined,
                apiUrl: undefined
            };
        }

        // Send request
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: endpointUrl,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                data: JSON.stringify(requestBody),
                onload: (response) => {
                    try {
                        if (response.status !== 200) {
                            throw new Error(`HTTP ${response.status}: ${response.responseText}`);
                        }

                        const data = JSON.parse(response.responseText);
                        
                        // Extract text content from response
                        const content = data.choices && data.choices[0] 
                            ? (data.choices[0].text || data.choices[0].message?.content || '')
                            : '';

                        // Extract thinking/reasoning content for thinking models (o1, o1-mini, o3)
                        const reasoning = data.choices && data.choices[0] && data.choices[0].message
                            ? (data.choices[0].message.reasoning_content || null)
                            : null;

                        resolve({
                            content,
                            thinking: reasoning,
                            rawResponse: data
                        });
                    } catch (error) {
                        reject(error);
                    }
                },
                onerror: (error) => {
                    reject(new Error('Network error: ' + (error.statusText || 'Unknown error')));
                },
                ontimeout: () => {
                    reject(new Error('Request timeout'));
                }
            });
        });
    }

    /**
     * Test API connectivity
     * @returns {Promise<boolean>} True if API is accessible
     */
    async testConnection() {
        try {
            const response = await this.sendCompletion({
                systemPrompt: 'You are a helpful assistant.',
                userPrompt: 'Reply with OK',
                options: { max_tokens: 10, temperature: 0 }
            });
            return Boolean(response.content);
        } catch (error) {
            console.error('Connection test failed:', error);
            return false;
        }
    }
}

module.exports = ChatGPTClient;
