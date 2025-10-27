// Lightweight client for a local RAG server (ingest/query)
// Uses GM_xmlhttpRequest to avoid CORS limitations in userscript context

const configStore = require('./configStore');

function getServerUrl() {
    const cfg = configStore.getConfig();
    return (cfg && cfg.ragServerUrl) ? cfg.ragServerUrl : 'http://localhost:7860';
}

function postJSON(path, body) {
    const url = `${getServerUrl()}${path}`;
    return new Promise((resolve, reject) => {
        try {
            GM_xmlhttpRequest({
                method: 'POST',
                url,
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(body || {}),
                onload: (res) => {
                    try {
                        if (res.status < 200 || res.status >= 300) {
                            return reject(new Error(`RAG server HTTP ${res.status}: ${res.responseText || ''}`));
                        }
                        const json = JSON.parse(res.responseText || '{}');
                        resolve(json);
                    } catch (e) {
                        reject(e);
                    }
                },
                onerror: (err) => reject(err),
                ontimeout: () => reject(new Error('RAG server request timed out'))
            });
        } catch (e) {
            reject(e);
        }
    });
}

/**
 * Ingest a PDF from base64 string
 * @param {{id:string, base64:string, chunkSize?:number, chunkOverlap?:number, metadata?:Object}} params
 */
async function ingestPdfBase64(params) {
    if (!params || !params.id || !params.base64) throw new Error('ingestPdfBase64 requires id and base64');
    return postJSON('/ingestPdf', params);
}

/**
 * Ingest plain text into the vector store
 * @param {{id:string, text:string, chunkSize?:number, chunkOverlap?:number, metadata?:Object}} params
 */
async function ingestText(params) {
    if (!params || !params.id || !params.text) throw new Error('ingestText requires id and text');
    return postJSON('/ingestText', params);
}

/**
 * Query top-K relevant chunks for a question
 * @param {string} question
 * @param {number} topK
 * @returns {Promise<{contexts: Array<{id:string, chunkId:string, text:string, score:number}>}>}
 */
async function query(question, topK = 5) {
    if (!question || !question.trim()) return { contexts: [] };
    return postJSON('/query', { question, topK });
}

// Expose a small global helper for quick manual ingests from console
try {
    if (typeof unsafeWindow !== 'undefined') {
        unsafeWindow.MGPT_RAG_addPdf = ingestPdfBase64;
        unsafeWindow.MGPT_RAG_addText = ingestText;
    } else if (typeof window !== 'undefined') {
        window.MGPT_RAG_addPdf = ingestPdfBase64;
        window.MGPT_RAG_addText = ingestText;
    }
} catch (e) { /* ignore */ }

module.exports = { ingestPdfBase64, ingestText, query };
