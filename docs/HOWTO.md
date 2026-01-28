# MGPT – How to use

This guide explains:
- How the in-page menu works
- Clipboard behavior
- Getting an API key

## Menu (Config Panel)

- Open/Close: Press Shift + Ctrl + H to toggle the MGPT configuration panel.
- Fields:
  - API Key: Your model API token. Required to query GPT.
  - Model: Select the model MGPT should use:
    - **o1-mini** - Fast reasoning model (Gyors gondolkodó)
    - **o1** - Advanced reasoning model (Fejlett gondolkodó) ⭐ NEW
    - **o3** - Latest reasoning model (Legújabb gondolkodó) ⭐ NEW
    - **gpt-4o** - Most capable general model
    - **gpt-5** - Advanced model
    - Note: Thinking models (o1, o3) are slower but more accurate
  - API URL: Endpoint for chat/completions. Defaults to OpenAI-compatible chat: https://api.openai.com/v1/chat/completions.
    - **Important:** Only the API key is needed for OpenAI - no other setup required!
  - File Upload (Responses API): ⭐ NEW
    - Upload PDF, TXT, DOC, DOCX files for better context
    - Click "Choose File" to select a file
    - Click green "Feltöltés" (Upload) button
    - Uploaded files appear in the list with their IDs
  - Copy to clipboard (copyResoults): When enabled, MGPT copies the raw answer(s) to your clipboard immediately after GPT replies.
- Buttons:
  - Save Settings: Persists the values to storage.
  - Test Settings: Sends a minimal request using the current values without saving. Useful to verify connectivity and credentials.

Notes:
- On first launch, the panel will be shown until a valid API key is provided and saved.
- The Test Settings button temporarily disables itself while the request runs. If it fails, check the browser console for details.
- **OpenAI Setup:** Only your API key is needed! File upload and Assistants API are included with standard OpenAI access.

## Clipboard behavior

When "copyResoults" is enabled:
- MGPT copies only the answer value(s):
  - Text: the final answer string.
  - Radio: the selected option text.
  - Checkbox/Select: a newline-separated list of option texts.
- This happens as soon as GPT returns, even if the page cannot be parsed or modified (avoids losing answers due to DOM quirks).

## Getting an API Key

You need an API-compatible endpoint and key. Options:

- OpenAI API
  - Sign up and create a key here: https://platform.openai.com/api-keys
  - API URL: https://api.openai.com/v1/chat/completions
  - Paste your key into the API Key field and click Save Settings.
  - **That's it!** No additional setup needed. File upload and Assistants API are included.

- Custom/Self-hosted API
  - If using a self-hosted OpenAI-compatible gateway, set API URL to your server (e.g., https://your-gateway.example.com/v1/chat/completions) and use the provided key.
  - The Test Settings button allows short keys for non-OpenAI hosts.

Permissions
- The userscript requests network permission to your API host(s) via @connect. If you change to a different host, ensure it's added to the userscript header (webpack.config.js → UserscriptPlugin headers.connect).

## Quick flow

1. Install Tampermonkey and the MGPT userscript.
2. Open a Moodle quiz page.
3. Open the config panel (Shift + Ctrl + H), paste your API key, choose model, and Save Settings.
4. (Optional) Select a thinking model (o1, o3) for better reasoning on complex questions.
5. (Optional) Upload study materials (PDF/TXT) using the file upload feature in the config panel.
6. (Optional) Enable "copyResoults" to auto-copy results.
7. Click a question block to ask GPT. A very subtle outline indicates progress; the outline turns softly green when done.

If something fails, open the browser console for errors. You can re-test your config with the Test Settings button in the panel.

### Using Uploaded Files with Assistants

After uploading files in the config panel, create an assistant via browser console (F12):

```javascript
// The file IDs are shown in the config panel after upload
MGPT_createAssistant({
    name: 'My Study Assistant',
    instructions: 'Answer questions using the uploaded course materials.',
    fileIds: ['file-abc123...']  // Use IDs from uploaded files
});
```

Once the assistant is created, MGPT will automatically use it for answering questions with access to your uploaded materials.
