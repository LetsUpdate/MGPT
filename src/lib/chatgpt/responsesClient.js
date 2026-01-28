/**
 * ChatGPT Responses API Client
 * Supports file uploads, thinking models, and advanced features
 * This is the new implementation replacing the old RAG system
 */

class ResponsesAPIClient {
    constructor(config = {}) {
        this.apiKey = config.apiKey || '';
        this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
        this.model = config.model || 'o1-mini';
        this.assistantId = null;
        this.threadId = null;
    }

    /**
     * Update client configuration
     */
    updateConfig(config) {
        if (config.apiKey !== undefined) this.apiKey = config.apiKey;
        if (config.baseUrl !== undefined) this.baseUrl = config.baseUrl;
        if (config.model !== undefined) this.model = config.model;
    }

    /**
     * Upload a file to OpenAI for use with assistants
     * @param {Object} params
     * @param {string} params.content - File content (base64 or text)
     * @param {string} params.filename - File name
     * @param {string} params.purpose - File purpose ('assistants' by default)
     * @returns {Promise<Object>} File upload response with file_id
     */
    async uploadFile({ content, filename, purpose = 'assistants' }) {
        if (!this.apiKey) {
            throw new Error('API key not configured');
        }

        // Create FormData for file upload
        const formData = new FormData();
        
        // Convert content to Blob
        let blob;
        if (content.startsWith('data:')) {
            // Base64 data URL
            const base64Data = content.split(',')[1];
            const binaryData = atob(base64Data);
            const bytes = new Uint8Array(binaryData.length);
            for (let i = 0; i < binaryData.length; i++) {
                bytes[i] = binaryData.charCodeAt(i);
            }
            blob = new Blob([bytes]);
        } else {
            // Plain text
            blob = new Blob([content], { type: 'text/plain' });
        }

        formData.append('file', blob, filename);
        formData.append('purpose', purpose);

        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: `${this.baseUrl}/files`,
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                },
                data: formData,
                onload: (response) => {
                    try {
                        if (response.status < 200 || response.status >= 300) {
                            throw new Error(`HTTP ${response.status}: ${response.responseText}`);
                        }
                        const data = JSON.parse(response.responseText);
                        resolve(data);
                    } catch (error) {
                        reject(error);
                    }
                },
                onerror: (error) => reject(error)
            });
        });
    }

    /**
     * Create an assistant with file support
     * @param {Object} params
     * @param {string} params.name - Assistant name
     * @param {string} params.instructions - System instructions
     * @param {Array<string>} params.fileIds - Array of file IDs
     * @param {Object} params.tools - Tools to enable (e.g., code_interpreter, file_search)
     * @returns {Promise<Object>} Assistant creation response
     */
    async createAssistant({ name = 'MGPT Assistant', instructions = '', fileIds = [], tools = [] }) {
        if (!this.apiKey) {
            throw new Error('API key not configured');
        }

        const requestBody = {
            model: this.model,
            name,
            instructions,
            tools: tools.length > 0 ? tools : [{ type: 'file_search' }],
            tool_resources: fileIds.length > 0 ? {
                file_search: {
                    vector_store_ids: fileIds
                }
            } : undefined
        };

        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: `${this.baseUrl}/assistants`,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                    'OpenAI-Beta': 'assistants=v2'
                },
                data: JSON.stringify(requestBody),
                onload: (response) => {
                    try {
                        if (response.status < 200 || response.status >= 300) {
                            throw new Error(`HTTP ${response.status}: ${response.responseText}`);
                        }
                        const data = JSON.parse(response.responseText);
                        this.assistantId = data.id;
                        resolve(data);
                    } catch (error) {
                        reject(error);
                    }
                },
                onerror: (error) => reject(error)
            });
        });
    }

    /**
     * Create a thread for conversation
     * @returns {Promise<Object>} Thread creation response
     */
    async createThread() {
        if (!this.apiKey) {
            throw new Error('API key not configured');
        }

        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: `${this.baseUrl}/threads`,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                    'OpenAI-Beta': 'assistants=v2'
                },
                data: JSON.stringify({}),
                onload: (response) => {
                    try {
                        if (response.status < 200 || response.status >= 300) {
                            throw new Error(`HTTP ${response.status}: ${response.responseText}`);
                        }
                        const data = JSON.parse(response.responseText);
                        this.threadId = data.id;
                        resolve(data);
                    } catch (error) {
                        reject(error);
                    }
                },
                onerror: (error) => reject(error)
            });
        });
    }

    /**
     * Send a message with thinking model support
     * @param {Object} params
     * @param {string} params.message - User message
     * @param {string} params.threadId - Thread ID (optional, creates new if not provided)
     * @param {string} params.assistantId - Assistant ID (optional)
     * @param {boolean} params.includeThinking - Include thinking process in response
     * @returns {Promise<Object>} Response with content and thinking (if enabled)
     */
    async sendMessage({ message, threadId, assistantId, includeThinking = false }) {
        if (!this.apiKey) {
            throw new Error('API key not configured');
        }

        // Use existing or create new thread
        const activeThreadId = threadId || this.threadId;
        if (!activeThreadId) {
            await this.createThread();
        }

        const activeAssistantId = assistantId || this.assistantId;

        // Add message to thread
        await this._addMessageToThread(activeThreadId || this.threadId, message);

        // Run the assistant (supports thinking models like o1, o3)
        const run = await this._runAssistant(activeThreadId || this.threadId, activeAssistantId);

        // Poll for completion and get response
        const response = await this._waitForCompletion(activeThreadId || this.threadId, run.id, includeThinking);

        return response;
    }

    /**
     * Add a message to a thread
     * @private
     */
    async _addMessageToThread(threadId, content) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: `${this.baseUrl}/threads/${threadId}/messages`,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                    'OpenAI-Beta': 'assistants=v2'
                },
                data: JSON.stringify({
                    role: 'user',
                    content
                }),
                onload: (response) => {
                    try {
                        if (response.status < 200 || response.status >= 300) {
                            throw new Error(`HTTP ${response.status}: ${response.responseText}`);
                        }
                        resolve(JSON.parse(response.responseText));
                    } catch (error) {
                        reject(error);
                    }
                },
                onerror: (error) => reject(error)
            });
        });
    }

    /**
     * Run an assistant on a thread
     * @private
     */
    async _runAssistant(threadId, assistantId) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: `${this.baseUrl}/threads/${threadId}/runs`,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                    'OpenAI-Beta': 'assistants=v2'
                },
                data: JSON.stringify({
                    assistant_id: assistantId
                }),
                onload: (response) => {
                    try {
                        if (response.status < 200 || response.status >= 300) {
                            throw new Error(`HTTP ${response.status}: ${response.responseText}`);
                        }
                        resolve(JSON.parse(response.responseText));
                    } catch (error) {
                        reject(error);
                    }
                },
                onerror: (error) => reject(error)
            });
        });
    }

    /**
     * Wait for run completion and retrieve messages
     * @private
     */
    async _waitForCompletion(threadId, runId, includeThinking) {
        const maxAttempts = 60; // 60 seconds timeout
        let attempts = 0;

        while (attempts < maxAttempts) {
            const run = await this._getRunStatus(threadId, runId);

            if (run.status === 'completed') {
                return await this._getMessages(threadId, includeThinking);
            } else if (run.status === 'failed' || run.status === 'cancelled' || run.status === 'expired') {
                throw new Error(`Run ${run.status}: ${run.last_error?.message || 'Unknown error'}`);
            }

            // Wait 1 second before next poll
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
        }

        throw new Error('Response timeout - assistant did not complete in time');
    }

    /**
     * Get run status
     * @private
     */
    async _getRunStatus(threadId, runId) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: `${this.baseUrl}/threads/${threadId}/runs/${runId}`,
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'OpenAI-Beta': 'assistants=v2'
                },
                onload: (response) => {
                    try {
                        if (response.status < 200 || response.status >= 300) {
                            throw new Error(`HTTP ${response.status}: ${response.responseText}`);
                        }
                        resolve(JSON.parse(response.responseText));
                    } catch (error) {
                        reject(error);
                    }
                },
                onerror: (error) => reject(error)
            });
        });
    }

    /**
     * Get messages from thread
     * @private
     */
    async _getMessages(threadId, includeThinking) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: `${this.baseUrl}/threads/${threadId}/messages`,
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'OpenAI-Beta': 'assistants=v2'
                },
                onload: (response) => {
                    try {
                        if (response.status < 200 || response.status >= 300) {
                            throw new Error(`HTTP ${response.status}: ${response.responseText}`);
                        }
                        const data = JSON.parse(response.responseText);
                        const messages = data.data || [];
                        
                        // Get latest assistant message
                        const assistantMessage = messages.find(m => m.role === 'assistant');
                        
                        if (!assistantMessage) {
                            throw new Error('No assistant response found');
                        }

                        const content = assistantMessage.content[0]?.text?.value || '';
                        
                        // Extract thinking if requested and available
                        let thinking = null;
                        if (includeThinking && assistantMessage.metadata?.thinking) {
                            thinking = assistantMessage.metadata.thinking;
                        }

                        resolve({
                            content,
                            thinking,
                            rawMessage: assistantMessage
                        });
                    } catch (error) {
                        reject(error);
                    }
                },
                onerror: (error) => reject(error)
            });
        });
    }
}

module.exports = ResponsesAPIClient;
