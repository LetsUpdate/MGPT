# MGPT – How to use

This guide explains:
- How the in-page menu works
- Clipboard behavior
- Getting an API key
- Running the local RAG server for development

## Menu (Config Panel)

- Open/Close: Press Shift + Ctrl + H to toggle the MGPT configuration panel.
- Fields:
  - API Key: Your model API token. Required to query GPT.
  - Model: Select the model MGPT should use (e.g., o1-mini, gpt-4o, gpt-5).
  - API URL: Endpoint for chat/completions. Defaults to OpenAI-compatible chat: https://api.openai.com/v1/chat/completions.
  - Copy to clipboard (copyResoults): When enabled, MGPT copies the raw answer(s) to your clipboard immediately after GPT replies.
- Buttons:
  - Save Settings: Persists the values to storage.
  - Test Settings: Sends a minimal request using the current values without saving. Useful to verify connectivity and credentials.

Notes:
- On first launch, the panel will be shown until a valid API key is provided and saved.
- The Test Settings button temporarily disables itself while the request runs. If it fails, check the browser console for details.

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

- Custom/Self-hosted API
  - If using a self-hosted OpenAI-compatible gateway, set API URL to your server (e.g., https://your-gateway.example.com/v1/chat/completions) and use the provided key.
  - The Test Settings button allows short keys for non-OpenAI hosts.

Permissions
- The userscript requests network permission to your API host(s) via @connect. If you change to a different host, ensure it’s added to the userscript header (webpack.config.js → UserscriptPlugin headers.connect).

## RAG server (local dev)

MGPT ships with a simple local Retrieval-Augmented Generation (RAG) server.

- Requirements: Node.js 18+
- Location: rag-server/
- Start (development):

```bash
cd rag-server
npm install
npm run dev
```

- Start (production-ish):

```bash
cd rag-server
npm install
npm start
```

- Default URL: http://localhost:7860
- Endpoints:
  - GET /health → { ok: true }
  - POST /ingestText { id, text, chunkSize?, chunkOverlap?, metadata? }
  - POST /ingestPdf { id, base64, ... } (auto-parses the PDF text)
  - POST /query { question, topK? }

Configuration in MGPT:
- In the extension code, `ragEnabled` defaults to true and the default URL is http://localhost:7860.
- You can change these in `src/configStore.js` if needed (ragServerUrl, ragTopK).

Tip: The first embed call downloads a small model (all-MiniLM) and may take a bit. Subsequent requests are much faster.

## Quick flow

1. Install Tampermonkey and the MGPT userscript.
2. Open a Moodle quiz page.
3. Open the config panel (Shift + Ctrl + H), paste your API key, choose model, and Save Settings.
4. (Optional) Enable "copyResoults" to auto-copy results.
5. (Dev) If you want RAG context, start the local RAG server (`npm run dev` in rag-server) and keep it running.
6. Click a question block to ask GPT. A very subtle outline indicates progress; the outline turns softly green when done.

If something fails, open the browser console for errors. You can re-test your config with the Test Settings button in the panel.
