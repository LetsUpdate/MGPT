/**
 * File Upload Helpers
 * Global functions exposed to browser console for easy file management
 */

const { ResponsesAPIClient } = require('./lib/chatgpt');
const configStore = require('./configStore');

let responsesClient = null;

/**
 * Initialize the Responses API client
 */
function initResponsesClient() {
    if (!responsesClient) {
        const config = configStore.getConfig();
        responsesClient = new ResponsesAPIClient({
            apiKey: config.apiKey,
            model: config.model
        });
    }
    return responsesClient;
}

/**
 * Upload a file for use with assistants
 * @param {Object} params
 * @param {string} params.filename - Name of the file
 * @param {string} params.content - File content (text or base64)
 * @returns {Promise<Object>} Upload result with file_id
 */
async function uploadFile({ filename, content }) {
    try {
        const client = initResponsesClient();
        
        // Better base64 detection - check if already has data: prefix or looks like base64
        let processedContent = content;
        
        // If it already has data: prefix, use as-is
        if (!content.startsWith('data:')) {
            // Check if it looks like base64 (long string with only valid base64 chars and proper padding)
            const isLikelyBase64 = content.length > 100 && 
                                   /^[A-Za-z0-9+/]*={0,2}$/.test(content) &&
                                   content.length % 4 === 0;
            
            if (isLikelyBase64) {
                // Add data URL prefix for binary content
                processedContent = `data:application/octet-stream;base64,${content}`;
            }
            // Otherwise treat as plain text (no modification needed)
        }
        
        const result = await client.uploadFile({
            filename,
            content: processedContent,
            purpose: 'assistants'
        });
        
        console.log(`✅ File uploaded successfully: ${filename} (ID: ${result.id})`);
        return result;
    } catch (error) {
        console.error('❌ File upload failed:', error.message);
        throw error;
    }
}

/**
 * Create an assistant with uploaded files
 * @param {Object} params
 * @param {string} params.name - Assistant name
 * @param {string} params.instructions - System instructions
 * @param {Array<string>} params.fileIds - Array of file IDs from uploads
 * @returns {Promise<Object>} Created assistant
 */
async function createAssistant({ name, instructions, fileIds = [] }) {
    try {
        const client = initResponsesClient();
        
        const result = await client.createAssistant({
            name,
            instructions,
            fileIds,
            tools: [{ type: 'file_search' }]
        });
        
        console.log(`✅ Assistant created: ${name} (ID: ${result.id})`);
        console.log(`   Files: ${fileIds.length} file(s) attached`);
        return result;
    } catch (error) {
        console.error('❌ Assistant creation failed:', error.message);
        throw error;
    }
}

/**
 * Send a message using the Responses API with thinking support
 * @param {Object} params
 * @param {string} params.message - Message to send
 * @param {boolean} params.includeThinking - Show thinking process
 * @returns {Promise<Object>} Response with content and thinking
 */
async function sendMessage({ message, includeThinking = false }) {
    try {
        const client = initResponsesClient();
        
        const result = await client.sendMessage({
            message,
            includeThinking
        });
        
        console.log('✅ Response received');
        if (result.thinking) {
            console.log('💭 Thinking:', result.thinking);
        }
        console.log('📝 Answer:', result.content);
        
        return result;
    } catch (error) {
        console.error('❌ Message failed:', error.message);
        throw error;
    }
}

/**
 * List all uploaded files
 * @returns {Array} List of uploaded files with metadata
 */
function listFiles() {
    try {
        const config = configStore.getConfig();
        const files = config.uploadedFiles || [];
        
        console.log(`📁 Uploaded files: ${files.length}`);
        files.forEach((file, index) => {
            console.log(`   ${index + 1}. ${file.filename} (ID: ${file.id})`);
            console.log(`      Uploaded: ${file.uploadedAt}`);
            console.log(`      Size: ${file.size} bytes`);
        });
        
        return files;
    } catch (error) {
        console.error('❌ Failed to list files:', error.message);
        throw error;
    }
}

/**
 * Get information about a specific file
 * @param {string} fileId - File ID to get info for
 * @returns {Object|null} File information or null if not found
 */
function getFileInfo(fileId) {
    try {
        const config = configStore.getConfig();
        const files = config.uploadedFiles || [];
        const file = files.find(f => f.id === fileId);
        
        if (file) {
            console.log(`📄 File info:`);
            console.log(`   Filename: ${file.filename}`);
            console.log(`   ID: ${file.id}`);
            console.log(`   Uploaded: ${file.uploadedAt}`);
            console.log(`   Size: ${file.size} bytes`);
            console.log(`   Purpose: ${file.purpose}`);
            return file;
        } else {
            console.warn(`⚠️ File not found: ${fileId}`);
            return null;
        }
    } catch (error) {
        console.error('❌ Failed to get file info:', error.message);
        throw error;
    }
}

/**
 * Delete an uploaded file
 * @param {string} fileId - File ID to delete
 * @returns {Promise<boolean>} True if deleted successfully
 */
async function deleteFile(fileId) {
    try {
        const client = initResponsesClient();
        
        // Get file info before deletion for logging
        const config = configStore.getConfig();
        const file = (config.uploadedFiles || []).find(f => f.id === fileId);
        const filename = file ? file.filename : fileId;
        
        console.log(`🗑️ Deleting file: ${filename} (${fileId})...`);
        
        // Delete from OpenAI
        await client.deleteFile(fileId);
        
        // Remove from local config
        const uploadedFiles = (config.uploadedFiles || []).filter(f => f.id !== fileId);
        configStore.update({ uploadedFiles });
        
        console.log(`✅ File deleted successfully: ${filename}`);
        console.log(`   Remaining files: ${uploadedFiles.length}`);
        
        return true;
    } catch (error) {
        console.error('❌ File deletion failed:', error.message);
        throw error;
    }
}

// Expose functions to global scope for console access
function exposeToConsole() {
    try {
        const w = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
        
        w.MGPT_uploadFile = uploadFile;
        w.MGPT_createAssistant = createAssistant;
        w.MGPT_sendMessage = sendMessage;
        w.MGPT_listFiles = listFiles;
        w.MGPT_getFileInfo = getFileInfo;
        w.MGPT_deleteFile = deleteFile;
        
        console.log('🚀 MGPT File Management API ready!');
        console.log('   📤 MGPT_uploadFile({ filename, content })');
        console.log('   🤖 MGPT_createAssistant({ name, instructions, fileIds })');
        console.log('   💬 MGPT_sendMessage({ message, includeThinking })');
        console.log('   📁 MGPT_listFiles() - List all uploaded files');
        console.log('   ℹ️  MGPT_getFileInfo(fileId) - Get file details');
        console.log('   🗑️  MGPT_deleteFile(fileId) - Delete a file');
    } catch (e) {
        console.warn('Could not expose MGPT helpers to console:', e);
    }
}

module.exports = {
    uploadFile,
    createAssistant,
    sendMessage,
    listFiles,
    getFileInfo,
    deleteFile,
    exposeToConsole
};
