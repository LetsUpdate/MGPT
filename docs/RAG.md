# Local RAG Guide (PDF/Text ➜ Context)

This adds an optional local Retrieval-Augmented Generation pipeline you can run on your own machine. It indexes your PDFs or notes and returns the most relevant chunks for each Moodle question.

## What you get
- A tiny local server (Express) at http://localhost:7860
- Ingest endpoints for PDF (base64) and plain text
- Fast local embeddings via `@xenova/transformers` (no external API)
- The userscript automatically queries top-k chunks and prepends them to the GPT prompt

## Start the server
- In a terminal:
  - `cd rag-server`
  - `npm install`
  - `npm start`
- First run will download a small embedding model; expect a short delay.

## Ingest content
You can ingest from the browser console (on a Moodle quiz page), or via curl.

### Browser console helpers
The userscript exposes two helpers:
- `MGPT_RAG_addPdf({ id, base64, chunkSize?, chunkOverlap?, metadata? })`
- `MGPT_RAG_addText({ id, text, chunkSize?, chunkOverlap?, metadata? })`

Examples:
```js
// Plain text
MGPT_RAG_addText({ id: 'notes-1', text: 'My course notes about CPU architectures ...' })

// PDF as Base64 string
MGPT_RAG_addPdf({ id: 'slides-week1', base64: '<PASTE_BASE64_PDF_HERE>' })
```

macOS tip to get PDF as base64 quickly:
```bash
# zsh
base64 -i /path/to/file.pdf | pbcopy
# Then paste into the base64 field in the console helper above
```

### cURL to the local server
```bash
# text
curl -X POST http://localhost:7860/ingestText \
  -H 'Content-Type: application/json' \
  -d '{"id":"notes-1","text":"CPU arch basics ..."}'

# pdf (base64)
curl -X POST http://localhost:7860/ingestPdf \
  -H 'Content-Type: application/json' \
  -d '{"id":"slides-week1","base64":"<BASE64>"}'
```

## Query / How it integrates
- The userscript calls `POST /query` with the question text.
- Top-k chunks (default k=5) are prepended to the prompt automatically.
- Toggle and tune via config defaults in `src/configStore.js`:
  - `ragEnabled` (true/false)
  - `ragServerUrl` (default `http://localhost:7860`)
  - `ragTopK` (number)

## Store and housekeeping
- Data is saved in `rag-server/data/store.json`.
- To reset, stop the server and delete that file.

## Troubleshooting
- Health check: `curl http://localhost:7860/health` ➜ `{"ok":true}`
- First embedding call downloads the model; allow a minute and check terminal logs.
- CORS: the userscript uses GM_xmlhttpRequest, so it bypasses normal CORS.
- Large PDFs: increase `chunkSize` or reduce `chunkOverlap` if ingest seems slow.
