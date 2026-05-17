const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const { OpenAI } = require('openai');
const { ChromaClient } = require('chromadb');
const { query } = require('../db');

function normaliseBaseUrl(url) {
  if (!url) {
    return undefined;
  }

  const trimmed = url.replace(/\/+$/, '');
  return trimmed.endsWith('/v1') ? trimmed : `${trimmed}/v1`;
}

const openAiApiKey = process.env.OPENAI_API_KEY || process.env.AI_API_KEY || 'missing-openai-key';
const openAiBaseUrl = normaliseBaseUrl(process.env.OPENAI_BASE_URL || process.env.AI_BASE_URL);
const embeddingModel = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';
const openai = new OpenAI({ apiKey: openAiApiKey, baseURL: openAiBaseUrl });
const chroma = new ChromaClient({ path: process.env.CHROMA_URL || 'http://localhost:8000' });
const hasOpenAiKey = Boolean(process.env.OPENAI_API_KEY || process.env.AI_API_KEY)
  && openAiApiKey !== 'sk-test';
const fallbackCollections = new Map();

function createRagError(message, code, cause) {
  const error = Object.assign(new Error(message), { code });
  if (cause) {
    error.cause = cause;
  }
  return error;
}

function estimateTokenCount(text) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean).length;
  return words;
}

function splitSentences(text) {
  const source = String(text || '');
  const sentences = [];
  let start = 0;
  let cursor = 0;

  while (cursor < source.length) {
    const char = source[cursor];
    const next = source[cursor + 1];

    if ((char === '.' || char === '!' || char === '?') && (next === undefined || /\s/.test(next))) {
      let sliceStart = start;
      let sliceEnd = cursor + 1;

      while (sliceStart < sliceEnd && /\s/.test(source[sliceStart])) {
        sliceStart += 1;
      }

      while (sliceEnd > sliceStart && /\s/.test(source[sliceEnd - 1])) {
        sliceEnd -= 1;
      }

      if (sliceEnd > sliceStart) {
        sentences.push({
          text: source.slice(sliceStart, sliceEnd),
          start: sliceStart,
          end: sliceEnd,
          tokenCount: estimateTokenCount(source.slice(sliceStart, sliceEnd)),
        });
      }

      start = cursor + 1;
      while (start < source.length && /\s/.test(source[start])) {
        start += 1;
      }
    }

    cursor += 1;
  }

  if (start < source.length) {
    let sliceStart = start;
    let sliceEnd = source.length;

    while (sliceStart < sliceEnd && /\s/.test(source[sliceStart])) {
      sliceStart += 1;
    }

    while (sliceEnd > sliceStart && /\s/.test(source[sliceEnd - 1])) {
      sliceEnd -= 1;
    }

    if (sliceEnd > sliceStart) {
      sentences.push({
        text: source.slice(sliceStart, sliceEnd),
        start: sliceStart,
        end: sliceEnd,
        tokenCount: estimateTokenCount(source.slice(sliceStart, sliceEnd)),
      });
    }
  }

  return sentences;
}

function buildPageMap(pdfPages) {
  let charOffset = 0;

  return (pdfPages || []).map((page) => {
    const entry = {
      page: page.pageNum,
      char_offset: charOffset,
    };

    charOffset += `${page.text || ''}\n`.length;
    return entry;
  });
}

function resolvePageNumber(pageMap, charIndex) {
  if (!Array.isArray(pageMap) || pageMap.length === 0) {
    return 1;
  }

  let resolvedPage = pageMap[0].page;

  for (const entry of pageMap) {
    if (entry.char_offset <= charIndex) {
      resolvedPage = entry.page;
    } else {
      break;
    }
  }

  return resolvedPage;
}

function buildChunkFromSentences(sentences, docName, pageMap, chunkIndex) {
  const text = sentences.map((sentence) => sentence.text).join(' ').trim();
  const charStart = sentences[0].start;
  const charEnd = sentences[sentences.length - 1].end;
  const midpoint = charStart + Math.floor((charEnd - charStart) / 2);

  return {
    text,
    metadata: {
      chunk_index: chunkIndex,
      doc_name: docName,
      page: resolvePageNumber(pageMap, midpoint),
      char_start: charStart,
      char_end: charEnd,
      token_estimate: estimateTokenCount(text),
    },
  };
}

function takeOverlapSentences(sentences, overlapTokens) {
  if (!overlapTokens || overlapTokens <= 0) {
    return [];
  }

  const overlap = [];
  let tokenCount = 0;

  for (let index = sentences.length - 1; index >= 0; index -= 1) {
    overlap.unshift(sentences[index]);
    tokenCount += sentences[index].tokenCount;

    if (tokenCount >= overlapTokens) {
      break;
    }
  }

  return overlap;
}

function splitOversizedSentence(sentence, chunkSize) {
  const words = Array.from(sentence.text.matchAll(/\S+/g));
  if (words.length === 0) {
    return [sentence];
  }

  const segments = [];
  let currentWords = [];

  for (const wordMatch of words) {
    currentWords.push(wordMatch);

    if (currentWords.length >= chunkSize) {
      const first = currentWords[0];
      const last = currentWords[currentWords.length - 1];
      const relativeStart = first.index || 0;
      const relativeEnd = (last.index || 0) + last[0].length;
      segments.push({
        text: sentence.text.slice(relativeStart, relativeEnd).trim(),
        start: sentence.start + relativeStart,
        end: sentence.start + relativeEnd,
        tokenCount: currentWords.length,
      });
      currentWords = [];
    }
  }

  if (currentWords.length > 0) {
    const first = currentWords[0];
    const last = currentWords[currentWords.length - 1];
    const relativeStart = first.index || 0;
    const relativeEnd = (last.index || 0) + last[0].length;
    segments.push({
      text: sentence.text.slice(relativeStart, relativeEnd).trim(),
      start: sentence.start + relativeStart,
      end: sentence.start + relativeEnd,
      tokenCount: currentWords.length,
    });
  }

  return segments.length > 0 ? segments : [sentence];
}

function getEmbeddingChunkConfig() {
  if (/multilingual-e5-base/i.test(embeddingModel)) {
    return { chunkSize: 220, overlap: 20 };
  }

  return { chunkSize: 500, overlap: 50 };
}

function chunkText(text, docName, pageMap, chunkSize = 500, overlap = 50) {
  const sentences = splitSentences(text).flatMap((sentence) => (
    sentence.tokenCount > chunkSize ? splitOversizedSentence(sentence, chunkSize) : [sentence]
  ));

  if (sentences.length === 0) {
    return [];
  }

  const chunks = [];
  let currentSentences = [];
  let currentTokens = 0;

  for (const sentence of sentences) {
    const wouldOverflow = currentSentences.length > 0 && currentTokens + sentence.tokenCount > chunkSize;

    if (wouldOverflow) {
      chunks.push(buildChunkFromSentences(currentSentences, docName, pageMap, chunks.length));
      const overlapSentences = takeOverlapSentences(currentSentences, overlap);
      const overlapTokens = overlapSentences.reduce((total, item) => total + item.tokenCount, 0);

      if (overlapTokens > 0 && overlapTokens + sentence.tokenCount <= chunkSize) {
        currentSentences = [...overlapSentences, sentence];
      } else {
        currentSentences = [sentence];
      }

      currentTokens = currentSentences.reduce((total, item) => total + item.tokenCount, 0);
      continue;
    }

    currentSentences.push(sentence);
    currentTokens += sentence.tokenCount;
  }

  if (currentSentences.length > 0) {
    chunks.push(buildChunkFromSentences(currentSentences, docName, pageMap, chunks.length));
  }

  return chunks;
}

async function extractChunksFromBuffer(buffer, docName) {
  const { chunkSize, overlap } = getEmbeddingChunkConfig();
  const isPdf = String(buffer.slice(0, 4)) === '%PDF';

  if (!isPdf) {
    const text = buffer.toString('utf8').trim();
    const pageMap = [{ page: 1, char_offset: 0 }];
    return chunkText(text, docName, pageMap, chunkSize, overlap);
  }

  const pdfPages = [];
  let pageCounter = 0;

  await pdfParse(buffer, {
    pagerender: async (pageData) => {
      const textContent = await pageData.getTextContent({ normalizeWhitespace: false, disableCombineTextItems: false });
      const pageText = textContent.items
        .map((item) => item.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      pageCounter += 1;
      pdfPages.push({ pageNum: pageCounter, text: pageText });
      return pageText;
    },
  });

  const combinedText = pdfPages.map((page) => page.text).join('\n').trim();

  if (!combinedText) {
    throw createRagError('No extractable text was found in the file.', 'RAG_EMPTY_DOCUMENT');
  }

  const pageMap = buildPageMap(pdfPages);
  return chunkText(combinedText, docName, pageMap, chunkSize, overlap);
}

async function loadFallbackChunksFromStorage(handoffId) {
  const result = await query(
    `
      SELECT d.filename, d.original_name
      FROM documents d
      WHERE d.handoff_id = $1
        AND d.status = 'indexed'
      ORDER BY d.uploaded_at ASC
    `,
    [handoffId],
  );

  const collected = [];

  for (const row of result.rows) {
    const filePath = path.resolve(__dirname, '../../uploads', row.filename);
    if (!fs.existsSync(filePath)) {
      continue;
    }

    const buffer = await fs.promises.readFile(filePath);
    const chunks = await extractChunksFromBuffer(buffer, row.original_name);
    collected.push(...chunks);
  }

  fallbackCollections.set(handoffId, collected);
  return collected;
}

async function getIndexedChunksForHandoff(handoffId, topK = 5) {
  const fallbackChunks = fallbackCollections.get(handoffId) || await loadFallbackChunksFromStorage(handoffId);

  return fallbackChunks.slice(0, topK).map((chunk) => ({
    text: chunk.text,
    doc_name: chunk.metadata.doc_name,
    page: chunk.metadata.page,
    chunk_index: chunk.metadata.chunk_index,
    score: 0.5,
  }));
}

const MATTER_REVIEW_PROBES = [
  { topic: 'stage_of_proceedings', query: 'stage of proceedings procedural posture case status' },
  { topic: 'most_recent_event', query: 'most recent order ruling decision filing event' },
  { topic: 'live_deadlines', query: 'deadline due date hearing date time limit must be filed by' },
  { topic: 'urgent_issues', query: 'urgent risk issue jurisdiction conflict missing defect' },
  { topic: 'next_step', query: 'next required step prepare file serve defence reply bundle' },
  { topic: 'claim_relief', query: 'claim relief damages breach contract amount claimed interest losses' },
  { topic: 'defence_dispute', query: 'defence counterclaim denied disputed acceptance testing notice failure' },
  { topic: 'evidence', query: 'witness statement expert evidence joint statement documents exhibits' },
  { topic: 'disclosure', query: 'disclosure inspection specific disclosure logs emails access order' },
  { topic: 'costs', query: 'costs budget estimated costs incurred VAT court fee currency value' },
  { topic: 'trial_timetable', query: 'trial date trial window timetable time estimate counsel dates to avoid' },
  { topic: 'parties', query: 'claimant defendant parties name address' },
];

async function getAllIndexedDocNames(handoffId) {
  const result = await query(
    `SELECT DISTINCT original_name FROM documents WHERE handoff_id = $1 AND status = 'indexed'`,
    [handoffId],
  );
  return result.rows.map((row) => row.original_name);
}

async function getTopicSearchChunks(handoffId, topK = 12) {
  const seen = new Map();
  const docOrder = [];
  const upsert = (chunk, topic) => {
    const key = `${chunk.doc_name}:${chunk.page}:${chunk.chunk_index}`;
    const existing = seen.get(key);
    if (chunk.doc_name && !docOrder.includes(chunk.doc_name)) {
      docOrder.push(chunk.doc_name);
    }
    if (!existing || chunk.score > existing.score) {
      seen.set(key, { ...chunk, probe: topic });
    }
  };

  for (const probe of MATTER_REVIEW_PROBES) {
    try {
      const probeChunks = await searchChunks(probe.query, handoffId, 3);
      probeChunks.forEach((chunk) => upsert(chunk, probe.topic));
    } catch (_error) {
      // One bad probe should not break the rest of the summary retrieval.
    }
  }

  try {
    const docNames = await getAllIndexedDocNames(handoffId);
    const coveredDocs = new Set(Array.from(seen.values()).map((chunk) => chunk.doc_name));
    for (const docName of docNames) {
      if (!docOrder.includes(docName)) {
        docOrder.push(docName);
      }
      if (coveredDocs.has(docName)) continue;
      const directChunks = await getChunksByDoc(handoffId, docName, 2);
      directChunks.forEach((chunk) => upsert(chunk, `doc_coverage:${docName}`));
    }
  } catch (_error) {
    // If document coverage lookup fails, return the topic probe results.
  }

  const allChunks = Array.from(seen.values());
  const selected = [];
  const selectedKeys = new Set();
  const addSelected = (chunk) => {
    if (!chunk || selected.length >= topK) {
      return;
    }
    const key = `${chunk.doc_name}:${chunk.page}:${chunk.chunk_index}`;
    if (selectedKeys.has(key)) {
      return;
    }
    selected.push(chunk);
    selectedKeys.add(key);
  };

  for (const docName of docOrder) {
    const bestForDoc = allChunks
      .filter((chunk) => chunk.doc_name === docName)
      .sort((left, right) => right.score - left.score)[0];
    addSelected(bestForDoc);
  }

  allChunks
    .sort((left, right) => right.score - left.score)
    .forEach(addSelected);

  const ranked = selected.slice(0, topK);
  if (ranked.length > 0) {
    return ranked;
  }

  return getIndexedChunksForHandoff(handoffId, topK);
}

async function getCollection(handoffId) {
  return chroma.getOrCreateCollection({ name: `handoff_${handoffId}` });
}

async function getChunksByDoc(handoffId, docName, limit = 2) {
  if (!hasOpenAiKey) {
    const fallbackChunks = fallbackCollections.get(handoffId) || await loadFallbackChunksFromStorage(handoffId);
    return fallbackChunks
      .filter((chunk) => chunk.metadata?.doc_name === docName)
      .slice(0, limit)
      .map((chunk) => ({
        text: chunk.text,
        doc_name: chunk.metadata.doc_name,
        page: chunk.metadata.page,
        chunk_index: chunk.metadata.chunk_index,
        score: 0.5,
      }));
  }

  try {
    const collection = await getCollection(handoffId);
    const result = await collection.get({
      where: { doc_name: docName },
      limit,
      include: ['documents', 'metadatas'],
    });
    const documents = result.documents || [];
    const metadatas = result.metadatas || [];
    return documents.map((text, index) => {
      const meta = metadatas[index] || {};
      return {
        text,
        doc_name: meta.doc_name || docName,
        page: meta.page,
        chunk_index: meta.chunk_index,
        score: 0.5,
      };
    });
  } catch (_error) {
    return [];
  }
}

async function updateDocumentStatus(docId, status, chunksCount, indexError = null) {
  await query(
    `
      UPDATE documents
      SET status = $2,
          chunks_count = $3,
          index_error = $4
      WHERE id = $1
    `,
    [docId, status, chunksCount, indexError],
  );
}

async function indexDocument(handoffId, docId, docName, pdfBuffer) {
  try {
    if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer)) {
      throw createRagError('A valid PDF buffer is required for indexing.', 'RAG_INVALID_PDF_BUFFER');
    }

    const chunks = await extractChunksFromBuffer(pdfBuffer, docName);

    if (chunks.length === 0) {
      throw createRagError('No chunks could be created from the PDF text.', 'RAG_NO_CHUNKS_CREATED');
    }

    if (!hasOpenAiKey) {
      const existing = fallbackCollections.get(handoffId) || [];
      fallbackCollections.set(handoffId, [
        ...existing,
        ...chunks,
      ]);
      await updateDocumentStatus(docId, 'indexed', chunks.length, null);
      return {
        chunks_indexed: chunks.length,
        status: 'indexed',
      };
    }

    const collection = await getCollection(handoffId);

    for (const chunk of chunks) {
      const response = await openai.embeddings.create({
        model: embeddingModel,
        input: chunk.text,
      });

      await collection.add({
        ids: [`${docId}_chunk_${chunk.metadata.chunk_index}`],
        embeddings: [response.data[0].embedding],
        documents: [chunk.text],
        metadatas: [chunk.metadata],
      });
    }

    await updateDocumentStatus(docId, 'indexed', chunks.length, null);

    return {
      chunks_indexed: chunks.length,
      status: 'indexed',
    };
  } catch (error) {
    console.error('[RAG] indexDocument failed', { docId, handoffId, reason: error.message });

    try {
      await updateDocumentStatus(docId, 'error', 0, error.message || 'Unknown indexing error');
    } catch (updateError) {
      console.error('[RAG] failed to update document error status', { docId, reason: updateError.message });
    }

    throw createRagError(error.message || 'Failed to index handoff document.', error.code || 'RAG_INDEX_FAILED', error);
  }
}

async function searchChunks(queryText, handoffId, topK = 5) {
  try {
    if (!queryText || !handoffId) {
      throw createRagError('Query text and handoff id are required for chunk search.', 'RAG_SEARCH_INVALID');
    }

    if (!hasOpenAiKey) {
      const fallbackChunks = fallbackCollections.get(handoffId) || await loadFallbackChunksFromStorage(handoffId);
      const queryTerms = new Set(String(queryText).toLowerCase().split(/[^a-z0-9]+/i).filter(Boolean));

      return fallbackChunks
        .map((chunk) => {
          const textTerms = new Set(String(chunk.text).toLowerCase().split(/[^a-z0-9]+/i).filter(Boolean));
          const overlap = Array.from(queryTerms).filter((term) => textTerms.has(term)).length;
          const score = queryTerms.size === 0 ? 0 : overlap / queryTerms.size;

          return {
            text: chunk.text,
            doc_name: chunk.metadata.doc_name,
            page: chunk.metadata.page,
            chunk_index: chunk.metadata.chunk_index,
            score,
          };
        })
        .filter((chunk) => chunk.score >= 0.5)
        .sort((left, right) => right.score - left.score)
        .slice(0, topK);
    }

    const embeddingResponse = await openai.embeddings.create({
      model: embeddingModel,
      input: queryText,
    });

    const collection = await getCollection(handoffId);
    const results = await collection.query({
      queryEmbeddings: [embeddingResponse.data[0].embedding],
      nResults: topK,
      include: ['documents', 'metadatas', 'distances'],
    });

    const documents = results.documents?.[0] || [];
    const metadatas = results.metadatas?.[0] || [];
    const distances = results.distances?.[0] || [];

    return documents
      .map((text, index) => {
        const metadata = metadatas[index] || {};
        const distance = typeof distances[index] === 'number' ? distances[index] : Math.sqrt(2);
        const score = Math.max(0, Math.min(1, 1 - (distance * distance) / 2));

        return {
          text,
          doc_name: metadata.doc_name,
          page: metadata.page,
          chunk_index: metadata.chunk_index,
          score,
        };
      })
      .filter((chunk) => chunk.score >= 0.35);
  } catch (error) {
    throw createRagError(error.message || 'Failed to search indexed chunks.', error.code || 'RAG_SEARCH_FAILED', error);
  }
}

module.exports = {
  buildPageMap,
  chunkText,
  indexDocument,
  searchChunks,
  getIndexedChunksForHandoff,
  getTopicSearchChunks,
  getChunksByDoc,
};
