/**
 * ChatGPT Responses API Client
 * Supports file uploads, thinking models, and advanced features
 * This is the new implementation replacing the old RAG system
 */

class ResponsesAPIClient {
    constructor(config = {}) {
        this.apiKey = config.apiKey || '';
        this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
        this.model = config.model || 'gpt-4o';
        this.assistantId = null;
        this.threadId = null;
        
        // Models compatible with Assistants API (only GPT-4 family supported)
        // GPT-5, GPT-5.2, and thinking models (o1, o3) are NOT supported
        this.assistantCompatibleModels = ['gpt-4', 'gpt-4-turbo', 'gpt-4o', 'gpt-3.5-turbo'];
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
     * Get a model compatible with Assistants API
     * @returns {string} Compatible model name
     */
    getAssistantCompatibleModel() {
        // Check if current model is compatible
        const isCompatible = this.assistantCompatibleModels.some(compatibleModel => 
            this.model.startsWith(compatibleModel)
        );
        
        if (isCompatible) {
            return this.model;
        }
        
        // Fallback to gpt-4o if current model is not compatible (e.g., o1, o1-mini, o3)
        console.warn(`[ResponsesAPIClient] Model "${this.model}" is not compatible with Assistants API. Using fallback: gpt-4o`);
        return 'gpt-4o';
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

        if (!content || content.length === 0) {
            throw new Error('File content cannot be empty');
        }

        if (!filename) {
            throw new Error('Filename is required');
        }

        // Convert content to binary data
        let binaryData;
        let mimeType = 'application/octet-stream';
        
        if (content.startsWith('data:')) {
            // Base64 data URL - extract mime type and data
            const matches = content.match(/^data:([^;]+);base64,(.+)$/);
            if (matches) {
                mimeType = matches[1];
                const base64Data = matches[2];
                binaryData = atob(base64Data);
            } else {
                throw new Error('Invalid data URL format');
            }
        } else {
            // Plain text
            binaryData = content;
            mimeType = 'text/plain';
        }

        // Manually construct multipart/form-data
        // GM_xmlhttpRequest doesn't support FormData objects, so we build it manually
        const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substr(2);
        const delimiter = '\r\n--' + boundary + '\r\n';
        const closeDelimiter = '\r\n--' + boundary + '--';

        // Build the multipart body
        let body = '';
        
        // Add file field
        body += delimiter;
        body += 'Content-Disposition: form-data; name="file"; filename="' + filename + '"\r\n';
        body += 'Content-Type: ' + mimeType + '\r\n\r\n';
        body += binaryData;
        
        // Add purpose field
        body += delimiter;
        body += 'Content-Disposition: form-data; name="purpose"\r\n\r\n';
        body += purpose;
        
        // Close
        body += closeDelimiter;

        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: `${this.baseUrl}/files`,
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'multipart/form-data; boundary=' + boundary
                },
                data: body,
                binary: true, // Important for binary file data
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
     * Note: Files must first be uploaded, then added to a vector store.
     * This is a simplified version - for production use, create vector stores separately.
     * @param {Object} params
     * @param {string} params.name - Assistant name
     * @param {string} params.instructions - System instructions (defaults to Computer Architecture 2 prompt)
     * @param {Array<string>} params.fileIds - Array of file IDs (will be added to a vector store)
     * @param {Object} params.tools - Tools to enable (e.g., code_interpreter, file_search)
     * @returns {Promise<Object>} Assistant creation response
     */
    async createAssistant({ name = 'MGPT Assistant', instructions = '', fileIds = [], tools = [] }) {
        if (!this.apiKey) {
            throw new Error('API key not configured');
        }

        // If files are provided, we need to create a vector store first
        let vectorStoreId = null;
        if (fileIds.length > 0) {
            vectorStoreId = await this._createVectorStore(fileIds);
        }

        // Use assistant-compatible model
        const assistantModel = this.getAssistantCompatibleModel();
        
        // If no instructions provided, use default system prompt for Computer Architecture 2
        // Import SystemPromptGenerator if not already imported
        if (!instructions) {
            try {
                const SystemPromptGenerator = require('../../systemPromptGenerator');
                instructions = SystemPromptGenerator.generate('text', 1, true); // forAssistant = true
            } catch (error) {
                // Fallback if SystemPromptGenerator not available
                instructions = 'You are an academic assistant specialized in Computer Architecture 2 (Számítógép architektúrák 2). Analyze questions carefully and provide accurate, technically precise answers.';
            }
        }

        const requestBody = {
            model: assistantModel,
            name,
            instructions,
            tools: tools.length > 0 ? tools : [{ type: 'file_search' }],
            tool_resources: vectorStoreId ? {
                file_search: {
                    vector_store_ids: [vectorStoreId]
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
     * Create a vector store from file IDs
     * @private
     */
    async _createVectorStore(fileIds) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: `${this.baseUrl}/vector_stores`,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                    'OpenAI-Beta': 'assistants=v2'
                },
                data: JSON.stringify({
                    file_ids: fileIds
                }),
                onload: (response) => {
                    try {
                        if (response.status < 200 || response.status >= 300) {
                            throw new Error(`HTTP ${response.status}: ${response.responseText}`);
                        }
                        const data = JSON.parse(response.responseText);
                        resolve(data.id);
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
        const maxAttempts = 120; // 2 minutes timeout (thinking models can be slow)
        let attempts = 0;

        while (attempts < maxAttempts) {
            const run = await this._getRunStatus(threadId, runId);

            if (run.status === 'completed') {
                return await this._getMessages(threadId, includeThinking);
            } else if (run.status === 'failed' || run.status === 'cancelled' || run.status === 'expired') {
                const errorMsg = run.last_error?.message || 'Unknown error';
                throw new Error(`Run ${run.status} (thread: ${threadId}, run: ${runId}): ${errorMsg}`);
            }

            // Wait 1 second before next poll
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
        }

        throw new Error(`Response timeout after ${maxAttempts} seconds (thread: ${threadId}, run: ${runId})`);
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
     * Strip citation markers from text
     * Removes OpenAI citation markers like 【18:1†filename.csv】
     * @private
     */
    _stripCitationMarkers(text) {
        if (!text) return text;
        
        // Remove citation markers in format 【...】
        // This includes patterns like 【18:1†Korszar2 kérdések - Munkalap1 másolata.csv】
        return text.replace(/【[^】]*】/g, '').trim();
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

                        // Get content and strip citation markers
                        let content = assistantMessage.content[0]?.text?.value || '';
                        content = this._stripCitationMarkers(content);
                        
                        // Extract annotations (file citations) if present
                        const annotations = assistantMessage.content[0]?.text?.annotations || [];
                        const extractedAnnotations = annotations.map(ann => {
                            if (ann.type === 'file_citation') {
                                return {
                                    type: 'file_citation',
                                    text: ann.text || '',
                                    file_id: ann.file_citation?.file_id || '',
                                    quote: ann.file_citation?.quote || ''
                                };
                            } else if (ann.type === 'file_path') {
                                return {
                                    type: 'file_path',
                                    text: ann.text || '',
                                    file_id: ann.file_path?.file_id || ''
                                };
                            }
                            return ann;
                        });
                        
                        // Extract thinking if requested and available
                        let thinking = null;
                        if (includeThinking && assistantMessage.metadata?.thinking) {
                            thinking = assistantMessage.metadata.thinking;
                        }

                        resolve({
                            content,
                            thinking,
                            annotations: extractedAnnotations,
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

    /**
     * Delete a file
     * @param {string} fileId - File ID to delete
     * @returns {Promise<Object>} Deletion response
     */
    async deleteFile(fileId) {
        if (!this.apiKey) {
            throw new Error('API key not configured');
        }

        if (!fileId) {
            throw new Error('File ID is required');
        }

        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'DELETE',
                url: `${this.baseUrl}/files/${fileId}`,
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                },
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
}

module.exports = ResponsesAPIClient;
