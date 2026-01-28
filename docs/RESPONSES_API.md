# ChatGPT Responses API & File Upload Guide

MGPT now supports the new ChatGPT Responses API with advanced features including file uploads and thinking models support.

## Features

### 🤖 Thinking Models Support

MGPT supports advanced thinking models like:
- **o1-mini** - Fast reasoning model
- **o1** - Advanced reasoning  
- **o3** - Latest reasoning model
- **gpt-4o** - Most capable model

These models can show their reasoning process (thinking) when enabled.

### 📁 File Upload Support

Upload your own files (PDFs, text documents) to provide context for better answers. The system uses OpenAI's Assistants API with file search capabilities.

## How to Use

### Basic Usage (No Files)

1. Open the config panel (Shift + Ctrl + H)
2. Enter your OpenAI API key
3. Select your preferred model
4. Click "Save Settings"
5. Start using MGPT on Moodle quizzes

### Using File Upload

The file upload feature allows you to upload documents that the AI can search through when answering questions.

#### Upload Files via Browser Console

On any Moodle page, open the browser console (F12) and use these functions:

```javascript
// Upload a text file
await MGPT_uploadFile({
    filename: 'my-notes.txt',
    content: 'Your notes content here...'
});

// Upload a PDF (base64 encoded)
await MGPT_uploadFile({
    filename: 'lecture-slides.pdf', 
    content: 'BASE64_ENCODED_PDF_DATA_HERE'
});
```

**Getting Base64 for PDF:**

On macOS/Linux:
```bash
base64 -i /path/to/file.pdf | pbcopy
```

On Windows PowerShell:
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\path\to\file.pdf")) | clip
```

Then paste the base64 string into the `content` field.

#### Create an Assistant with Files

After uploading files, create an assistant:

```javascript
// Create assistant with uploaded files
await MGPT_createAssistant({
    name: 'My Study Assistant',
    instructions: 'You are a helpful study assistant. Use the uploaded materials to answer questions accurately.',
    fileIds: ['file-abc123'] // IDs from uploaded files
});
```

#### Using the Assistant

Once an assistant is created, MGPT will automatically use it for answering questions. The assistant will search through your uploaded files to provide better, more accurate answers based on your study materials.

### Thinking Models

To see the model's reasoning process:

1. Use a thinking model (o1, o1-mini, o3)
2. The model will show its step-by-step reasoning
3. This helps understand how it arrived at the answer

Note: Thinking output is currently logged to the console. UI display coming soon.

## API Configuration

### Standard Setup (OpenAI)

- **API URL:** `https://api.openai.com/v1/chat/completions`
- **API Key:** Your OpenAI API key from https://platform.openai.com/api-keys
- **Model:** Choose from available models (o1-mini recommended for best speed/quality)

### Custom/Self-Hosted Setup

If using a compatible API:
- Set **API URL** to your endpoint
- Provide your custom API key
- Select compatible model

## Advanced Features

### Thread-Based Conversations

The Responses API uses threads to maintain conversation context:
- Each question can be part of a conversation thread
- Context is maintained across multiple questions
- Better for complex, multi-part problems

### File Search

When files are uploaded:
- The AI automatically searches relevant content
- Semantic search finds the most relevant information
- Answers are grounded in your uploaded materials

## Limitations

- File uploads require OpenAI API (not compatible with all custom endpoints)
- Maximum file size depends on OpenAI limits (typically 512MB per file)
- File processing may take a few moments after upload
- Thinking models may have different rate limits

## Troubleshooting

### Files Not Working

1. Check that your API key has access to Assistants API
2. Verify file upload was successful (check returned file ID)
3. Ensure assistant was created with correct file IDs

### Slow Responses

- Thinking models (o1, o3) are slower but more accurate
- Use o1-mini for faster responses
- Switch to gpt-4o for fastest responses without thinking

### Console Functions Not Available

- Make sure MGPT userscript is loaded
- Check browser console for errors
- Reload the page and try again

## Examples

### Example: Upload Study Notes

```javascript
// 1. Upload your notes
const fileResult = await MGPT_uploadFile({
    filename: 'computer-science-notes.txt',
    content: `
    CPU Architecture:
    - ALU performs arithmetic operations
    - Control Unit manages execution
    - Registers provide fast storage
    ...
    `
});

console.log('File uploaded:', fileResult.id);

// 2. Create assistant
await MGPT_createAssistant({
    name: 'CS Study Helper',
    instructions: 'Help answer computer science questions using the uploaded study materials.',
    fileIds: [fileResult.id]
});

// 3. Use MGPT normally - it will now search your notes!
```

### Example: Multiple Files

```javascript
// Upload multiple files
const file1 = await MGPT_uploadFile({
    filename: 'chapter1.txt',
    content: '...'
});

const file2 = await MGPT_uploadFile({
    filename: 'chapter2.txt', 
    content: '...'
});

// Create assistant with both files
await MGPT_createAssistant({
    name: 'Multi-Chapter Assistant',
    instructions: 'Answer questions using information from multiple chapters.',
    fileIds: [file1.id, file2.id]
});
```

## Privacy & Security

- Your files are uploaded to OpenAI's servers
- Files are only accessible to your API key
- Delete files when no longer needed
- Review OpenAI's data usage policy

## Future Enhancements

Planned improvements:
- [ ] UI for file management (upload, list, delete)
- [ ] Automatic file format detection
- [ ] Thinking process display in UI
- [ ] Conversation thread management
- [ ] File upload progress indicators

---

For more information:
- [OpenAI Assistants API Documentation](https://platform.openai.com/docs/assistants/overview)
- [MGPT Main Documentation](../README.md)
- [How to Use Guide](HOWTO.md)
