#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { pipeline } from '@xenova/transformers';

const DATA_DIR = path.resolve(process.cwd(), 'rag-server/data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

function chunkText(text, chunkSize = 450, overlap = 80) {
  const chunks = [];
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return chunks;
  let start = 0;
  while (start < clean.length) {
    const end = Math.min(clean.length, start + chunkSize);
    const piece = clean.slice(start, end).trim();
    if (piece) chunks.push(piece);
    if (end >= clean.length) break;
    start = Math.max(0, end - overlap);
  }
  return chunks;
}

async function getEmbedder() {
  console.log('Loading embedding model...');
  const model = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  return model;
}

async function embedTexts(model, texts) {
  const output = await model(texts, { pooling: 'mean', normalize: true });
  if (output && typeof output.tolist === 'function') {
    return await output.tolist();
  }
  if (Array.isArray(output) && Array.isArray(output[0])) return output;
  if (output && output.data) {
    const flat = Array.from(output.data);
    if (texts.length === 1) return [flat];
    const dim = Math.round(flat.length / texts.length);
    const out = [];
    for (let i = 0; i < texts.length; i++) out.push(flat.slice(i * dim, (i + 1) * dim));
    return out;
  }
  // fallback
  return JSON.parse(JSON.stringify(output));
}

async function main() {
  const argChunk = Number(process.argv[2]) || 450;
  const argOverlap = Number(process.argv[3]) || 80;

  if (!fs.existsSync(STORE_FILE)) {
    console.error('store.json not found at', STORE_FILE);
    process.exit(1);
  }

  const store = JSON.parse(fs.readFileSync(STORE_FILE, 'utf-8'));
  const model = await getEmbedder();

  // collect vectors grouped by doc id
  const byDoc = new Map();
  for (const v of store.vectors || []) {
    if (!byDoc.has(v.id)) byDoc.set(v.id, []);
    byDoc.get(v.id).push(v);
  }

  const newVectorsAll = [];

  for (const [docId, vecs] of byDoc.entries()) {
    console.log(`Processing doc ${docId}: ${vecs.length} original chunks`);
    // gather pieces by splitting each original chunk
    const pieces = [];
    for (const v of vecs) {
      const sub = chunkText(v.text, argChunk, argOverlap);
      for (const s of sub) pieces.push(s);
    }

    if (pieces.length === 0) {
      console.log(`No pieces for ${docId}, skipping`);
      continue;
    }

    console.log(` - embedding ${pieces.length} subchunks (chunkSize=${argChunk}, overlap=${argOverlap})`);
    const embeddings = await embedTexts(model, pieces);
    if (!embeddings || embeddings.length !== pieces.length) {
      console.error('Embedding count mismatch for', docId);
      process.exit(1);
    }

    for (let i = 0; i < pieces.length; i++) {
      newVectorsAll.push({ id: docId, chunkId: `${docId}::${i}`, text: pieces[i], embedding: embeddings[i] });
    }
  }

  // Replace vectors for docs processed
  // We will keep docs metadata as-is, but replace all vectors with newVectorsAll
  store.vectors = newVectorsAll;
  fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2));
  console.log('store.json updated. New vector count:', store.vectors.length);
}

main().catch(err => {
  console.error('Error in resplit_store:', err);
  process.exit(1);
});
