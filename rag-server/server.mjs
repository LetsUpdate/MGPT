import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import { pipeline } from '@xenova/transformers';

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const DATA_DIR = path.resolve(process.cwd(), 'rag-server', 'data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(STORE_FILE)) {
  fs.writeFileSync(STORE_FILE, JSON.stringify({ docs: {}, vectors: [] }, null, 2));
}

let embedder = null;
async function getEmbedder() {
  if (embedder) return embedder;
  // Use a small all-MiniLM embedding model (sentence-transformers) via Xenova
  // Model auto-downloads on first use and is cached in node_modules/.cache or HF cache
  embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  return embedder;
}

function loadStore() {
  const raw = fs.readFileSync(STORE_FILE, 'utf-8');
  return JSON.parse(raw);
}

function saveStore(store) {
  fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2));
}

function chunkText(text, chunkSize = 800, overlap = 120) {
  const chunks = [];
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return chunks;
  let start = 0;
  while (start < clean.length) {
    const end = Math.min(clean.length, start + chunkSize);
    const piece = clean.slice(start, end);
    chunks.push(piece);
    if (end >= clean.length) break;
    start = Math.max(0, end - overlap);
  }
  return chunks;
}

async function embedTexts(texts) {
  const model = await getEmbedder();
  // returns tensor [n, d]; convert to arrays
  const output = await model(texts, { pooling: 'mean', normalize: true });
  const arr = output.data ?? output.tolist?.();
  // Xenova returns a Tensor object with .tolist()
  if (arr && typeof arr.tolist === 'function') return arr.tolist();
  return Array.isArray(arr) ? arr : output.tolist();
}

function cosineSimilarity(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum; // vectors are normalized
}

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.post('/ingestText', async (req, res) => {
  try {
    const { id, text, chunkSize, chunkOverlap, metadata } = req.body || {};
    if (!id || !text) return res.status(400).json({ error: 'id and text required' });
    const store = loadStore();
    const chunks = chunkText(text, chunkSize, chunkOverlap);
    const vecs = await embedTexts(chunks);
    const docMeta = { id, metadata: metadata || {}, createdAt: Date.now() };
    store.docs[id] = docMeta;
    // remove old vectors of same doc
    store.vectors = store.vectors.filter(v => v.id !== id);
    chunks.forEach((chunk, i) => {
      store.vectors.push({ id, chunkId: `${id}::${i}`, text: chunk, embedding: vecs[i] });
    });
    saveStore(store);
    res.json({ ok: true, chunks: chunks.length });
  } catch (e) {
    console.error('ingestText error', e);
    res.status(500).json({ error: String(e) });
  }
});

app.post('/ingestPdf', async (req, res) => {
  try {
    const { id, base64, chunkSize, chunkOverlap, metadata } = req.body || {};
    if (!id || !base64) return res.status(400).json({ error: 'id and base64 required' });
    const buf = Buffer.from(base64, 'base64');
    const parsed = await pdfParse(buf);
    const text = parsed.text || '';
    const store = loadStore();
    const chunks = chunkText(text, chunkSize, chunkOverlap);
    const vecs = await embedTexts(chunks);
    const docMeta = { id, metadata: { ...(metadata||{}), source: 'pdf' }, createdAt: Date.now() };
    store.docs[id] = docMeta;
    store.vectors = store.vectors.filter(v => v.id !== id);
    chunks.forEach((chunk, i) => {
      store.vectors.push({ id, chunkId: `${id}::${i}`, text: chunk, embedding: vecs[i] });
    });
    saveStore(store);
    res.json({ ok: true, chunks: chunks.length, pages: parsed.numpages || undefined });
  } catch (e) {
    console.error('ingestPdf error', e);
    res.status(500).json({ error: String(e) });
  }
});

app.post('/query', async (req, res) => {
  try {
    const { question, topK = 5 } = req.body || {};
    if (!question) return res.status(400).json({ error: 'question required' });
    const store = loadStore();
    if (!store.vectors.length) return res.json({ contexts: [] });
    const qVec = (await embedTexts([question]))[0];
    const scored = store.vectors.map(v => ({
      id: v.id,
      chunkId: v.chunkId,
      text: v.text,
      score: cosineSimilarity(qVec, v.embedding)
    }));
    scored.sort((a,b) => b.score - a.score);
    const contexts = scored.slice(0, Math.min(topK, scored.length));
    res.json({ contexts });
  } catch (e) {
    console.error('query error', e);
    res.status(500).json({ error: String(e) });
  }
});

const PORT = Number(process.env.PORT || 7860);
app.listen(PORT, () => {
  console.log(`[MGPT RAG] server listening on http://localhost:${PORT}`);
});
