# Migration Guide - From RAG to Responses API

This guide helps users transition from the old RAG system to the new ChatGPT Responses API with file upload support.

## What Changed?

### Removed Features ❌
- **Local RAG Server** - The local vector database server has been removed
- **RAG Client** - The client-side RAG integration is no longer available
- **RAG Configuration** - All RAG-related settings have been removed from the UI

### New Features ✅
- **ChatGPT Responses API** - Better integration with OpenAI's latest APIs
- **File Upload Support** - Upload PDFs and text files directly to OpenAI
- **Thinking Models** - Support for o1, o1-mini, o3 models with reasoning
- **Modular Architecture** - Cleaner code structure following clean code principles

## For Existing Users

### If You Were Using RAG

The old RAG system required running a local server and manually indexing documents. The new system is simpler and more powerful:

**Old Way (RAG):**
```bash
# Start local server
cd rag-server
npm install
npm start

# Ingest documents via console
MGPT_RAG_addPdf({ id: 'doc1', base64: '...' })
```

**New Way (Responses API):**
```javascript
// Upload directly to OpenAI (no local server needed)
const file = await MGPT_uploadFile({
    filename: 'my-document.pdf',
    content: 'BASE64_CONTENT'
});

// Create assistant with file
await MGPT_createAssistant({
    name: 'Study Helper',
    instructions: 'Help with coursework',
    fileIds: [file.id]
});
```

### If You Were NOT Using RAG

No changes needed! Your MGPT will continue to work exactly as before. The new features are optional enhancements.

## Migration Steps

### 1. Update MGPT

Install the latest version:
- If using Tampermonkey: The script will auto-update
- If building from source: `git pull && npm install && npm run build:prod`

### 2. Remove Old RAG Server (if installed)

If you had the RAG server installed:
```bash
# The rag-server directory has been removed
# If you have local data, it's safe to delete:
rm -rf rag-server/
```

### 3. Configure for File Upload (Optional)

If you want to use file upload features:

1. Get an OpenAI API key from https://platform.openai.com/api-keys
2. Ensure your key has access to Assistants API
3. Upload files using the console helpers (see examples below)

## Feature Comparison

| Feature | Old RAG | New Responses API |
|---------|---------|-------------------|
| File Upload | PDF, TXT | PDF, TXT, DOCX, and more |
| Server Required | Yes (local) | No (cloud-based) |
| Search Quality | Good (MiniLM) | Excellent (GPT-4 embeddings) |
| Thinking Models | No | Yes (o1, o3) |
| Setup Complexity | Medium | Easy |
| API Calls | Local only | OpenAI API |
| Cost | Free (self-hosted) | Uses OpenAI credits |

## Examples

### Upload Study Materials

```javascript
// 1. Upload a PDF
const pdf = await MGPT_uploadFile({
    filename: 'lecture-notes.pdf',
    content: 'BASE64_ENCODED_PDF'
});

// 2. Upload text notes
const notes = await MGPT_uploadFile({
    filename: 'study-notes.txt',
    content: 'Chapter 1: Introduction\nKey concepts...'
});

// 3. Create assistant with both files
await MGPT_createAssistant({
    name: 'Course Assistant',
    instructions: 'Help answer questions using the provided course materials.',
    fileIds: [pdf.id, notes.id]
});

// 4. Use MGPT normally - it will search your files!
```

### Use Thinking Models

Thinking models show their reasoning process:

1. Select a thinking model (o1-mini, o1, o3) in the config panel
2. The model will show its step-by-step reasoning
3. Great for complex problems or when you want to understand the logic

## Troubleshooting

### "MGPT_uploadFile is not defined"

Make sure MGPT has loaded. Check the console for:
```
🚀 MGPT File Upload API ready!
```

### "API key not configured"

Set your API key in the config panel (Shift + Ctrl + H).

### Files not being used in responses

1. Check that you created an assistant with the file IDs
2. Verify files were uploaded successfully (check for success message)
3. Make sure you're using a compatible model

### Rate limits or errors

File operations use the Assistants API which has different rate limits than Chat Completions. If you hit limits:
- Wait a few moments before retrying
- Consider upgrading your OpenAI plan
- Use simpler models for routine questions

## Benefits of the New System

1. **No Local Server** - No need to run and maintain a local server
2. **Better Search** - OpenAI's embeddings are more accurate
3. **More File Types** - Support for more document formats
4. **Thinking Models** - See the AI's reasoning process
5. **Automatic Updates** - Always uses the latest OpenAI features
6. **Simpler Setup** - Just upload and use

## Need Help?

- Check the [Responses API documentation](RESPONSES_API.md)
- Review the [How To guide](HOWTO.md)
- Open an issue on GitHub if you encounter problems

## Feedback

We'd love to hear about your experience with the new system! Please share:
- What you like about the new Responses API
- Any issues you encounter
- Feature requests for future versions

Thank you for using MGPT! 🚀
