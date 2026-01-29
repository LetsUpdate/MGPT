/**
 * Document Manager
 * Manages uploaded files for Responses API
 */

const configStore = require('./configStore');
const { ResponsesAPIClient } = require('./lib/chatgpt');
const { Logger } = require('./logger');

class DocumentManager {
    constructor() {
        this.responsesClient = null;
    }

    /**
     * Initialize the Responses API client
     */
    initClient() {
        if (!this.responsesClient) {
            const config = configStore.getConfig();
            this.responsesClient = new ResponsesAPIClient({
                apiKey: config.apiKey,
                model: config.model
            });
            Logger.debug('DOC_MGMT', 'ResponsesAPIClient initialized');
        }
        return this.responsesClient;
    }

    /**
     * Upload a file
     * @param {Object} params
     * @param {string} params.filename - File name
     * @param {string} params.content - File content (text or base64)
     * @returns {Promise<Object>} Upload result
     */
    async uploadFile({ filename, content }) {
        Logger.info('DOC_MGMT', `Starting file upload: ${filename}`);
        
        try {
            const client = this.initClient();
            
            // Detect if content is base64
            let processedContent = content;
            if (!content.startsWith('data:')) {
                const isLikelyBase64 = content.length > 100 && 
                                       /^[A-Za-z0-9+/]*={0,2}$/.test(content) &&
                                       content.length % 4 === 0;
                
                if (isLikelyBase64) {
                    processedContent = `data:application/octet-stream;base64,${content}`;
                    Logger.debug('DOC_MGMT', 'Detected base64 content, adding data URL prefix');
                }
            }
            
            Logger.logAPIRequest('DOC_MGMT', '/files', 'POST', { filename });
            
            const result = await client.uploadFile({
                filename,
                content: processedContent,
                purpose: 'assistants'
            });
            
            Logger.logAPIResponse('DOC_MGMT', '/files', 200, { fileId: result.id });
            
            // Save to uploaded files list
            const config = configStore.getConfig();
            const uploadedFiles = config.uploadedFiles || [];
            
            const fileInfo = {
                id: result.id,
                filename: filename,
                uploadedAt: new Date().toISOString(),
                size: result.bytes || 0,
                purpose: result.purpose
            };
            
            uploadedFiles.push(fileInfo);
            configStore.update({ uploadedFiles });
            
            Logger.logFileOperation('UPLOAD_SUCCESS', filename, fileInfo);
            
            return fileInfo;
        } catch (error) {
            Logger.error('DOC_MGMT', `File upload failed: ${filename}`, error);
            throw error;
        }
    }

    /**
     * List all uploaded files
     * @returns {Array} List of uploaded files
     */
    listFiles() {
        const config = configStore.getConfig();
        const files = config.uploadedFiles || [];
        Logger.debug('DOC_MGMT', `Listing ${files.length} uploaded files`);
        return files;
    }

    /**
     * Delete a file
     * @param {string} fileId - File ID to delete
     * @returns {Promise<void>}
     */
    async deleteFile(fileId) {
        Logger.info('DOC_MGMT', `Deleting file: ${fileId}`);
        
        try {
            const client = this.initClient();
            
            Logger.logAPIRequest('DOC_MGMT', `/files/${fileId}`, 'DELETE');
            
            await client.deleteFile(fileId);
            
            Logger.logAPIResponse('DOC_MGMT', `/files/${fileId}`, 200);
            
            // Remove from uploaded files list
            const config = configStore.getConfig();
            const uploadedFiles = (config.uploadedFiles || []).filter(f => f.id !== fileId);
            configStore.update({ uploadedFiles });
            
            Logger.logFileOperation('DELETE_SUCCESS', fileId);
            
            return true;
        } catch (error) {
            Logger.error('DOC_MGMT', `File deletion failed: ${fileId}`, error);
            throw error;
        }
    }

    /**
     * Get file info
     * @param {string} fileId - File ID
     * @returns {Object|null} File info
     */
    getFileInfo(fileId) {
        const config = configStore.getConfig();
        const files = config.uploadedFiles || [];
        return files.find(f => f.id === fileId) || null;
    }

    /**
     * Create assistant with files
     * @param {Object} params
     * @param {string} params.name - Assistant name
     * @param {string} params.instructions - Instructions (optional, defaults to Computer Architecture 2 prompt)
     * @param {Array<string>} params.fileIds - File IDs
     * @returns {Promise<Object>} Created assistant
     */
    async createAssistantWithFiles({ name = 'MGPT Assistant', instructions = '', fileIds = [] }) {
        Logger.info('DOC_MGMT', `Creating assistant: ${name} with ${fileIds.length} files`);
        
        try {
            const client = this.initClient();
            
            // If no instructions provided, use default system prompt
            if (!instructions) {
                const SystemPromptGenerator = require('./systemPromptGenerator');
                instructions = SystemPromptGenerator.generate('text', 1, true); // forAssistant = true
            }
            
            Logger.logAPIRequest('DOC_MGMT', '/assistants', 'POST', { name, fileCount: fileIds.length });
            
            const result = await client.createAssistant({
                name,
                instructions,
                fileIds,
                tools: [{ type: 'file_search' }]
            });
            
            Logger.logAPIResponse('DOC_MGMT', '/assistants', 200, { assistantId: result.id });
            
            // Save assistant ID
            configStore.update({ 
                assistantId: result.id,
                threadId: null // Reset thread when creating new assistant
            });
            
            Logger.logAssistantOperation('CREATE_SUCCESS', result.id, {
                name,
                fileCount: fileIds.length,
                model: result.model
            });
            
            Logger.logContextVerification(fileIds.length > 0, fileIds.length, result.id);
            
            return result;
        } catch (error) {
            Logger.error('DOC_MGMT', `Assistant creation failed: ${name}`, error);
            throw error;
        }
    }

    /**
     * Get current assistant status
     * @returns {Object} Assistant status
     */
    getAssistantStatus() {
        const config = configStore.getConfig();
        const files = config.uploadedFiles || [];
        
        return {
            hasAssistant: !!config.assistantId,
            assistantId: config.assistantId,
            fileCount: files.length,
            files: files,
            isActive: config.useResponsesAPI && !!config.assistantId
        };
    }
}

// Export singleton instance
module.exports = new DocumentManager();
