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
        
        // Detect if content is base64
        const isBase64 = content.length > 100 && /^[A-Za-z0-9+/=]+$/.test(content.substring(0, 100));
        
        if (isBase64 && !content.startsWith('data:')) {
            // Add data URL prefix for PDF/binary
            content = `data:application/octet-stream;base64,${content}`;
        }
        
        const result = await client.uploadFile({
            filename,
            content,
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

// Expose functions to global scope for console access
function exposeToConsole() {
    try {
        const w = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
        
        w.MGPT_uploadFile = uploadFile;
        w.MGPT_createAssistant = createAssistant;
        w.MGPT_sendMessage = sendMessage;
        
        console.log('🚀 MGPT File Upload API ready!');
        console.log('   Use: MGPT_uploadFile({ filename, content })');
        console.log('   Use: MGPT_createAssistant({ name, instructions, fileIds })');
        console.log('   Use: MGPT_sendMessage({ message, includeThinking })');
    } catch (e) {
        console.warn('Could not expose MGPT helpers to console:', e);
    }
}

module.exports = {
    uploadFile,
    createAssistant,
    sendMessage,
    exposeToConsole
};
