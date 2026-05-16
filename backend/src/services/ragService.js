/**
 * Split text into sentence-aware chunks without breaking words when possible.
 * @param {string} text
 * @param {number} chunkSize
 * @param {number} overlap
 * @returns {string[]}
 */
function chunkText(text, chunkSize = 500, overlap = 50) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();

  if (!normalized) {
    return [];
  }

  const sentences = normalized.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [normalized];
  const chunks = [];
  let current = '';

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    const candidate = current ? `${current} ${trimmedSentence}` : trimmedSentence;

    if (candidate.length <= chunkSize) {
      current = candidate;
      continue;
    }

    if (current) {
      chunks.push(current.trim());
      const overlapSlice = current.slice(Math.max(0, current.length - overlap)).trim();
      current = overlapSlice ? `${overlapSlice} ${trimmedSentence}`.trim() : trimmedSentence;
      continue;
    }

    const words = trimmedSentence.split(/\s+/);
    let wordChunk = '';

    for (const word of words) {
      const wordCandidate = wordChunk ? `${wordChunk} ${word}` : word;

      if (wordCandidate.length <= chunkSize) {
        wordChunk = wordCandidate;
      } else {
        if (wordChunk) {
          chunks.push(wordChunk.trim());
        }

        const overlapSlice = wordChunk.slice(Math.max(0, wordChunk.length - overlap)).trim();
        wordChunk = overlapSlice ? `${overlapSlice} ${word}`.trim() : word;
      }
    }

    current = wordChunk;
  }

  if (current) {
    chunks.push(current.trim());
  }

  return chunks;
}

/**
 * Persist document chunks into ChromaDB.
 * @param {string} docId
 * @param {string} text
 * @param {string} caseId
 * @param {string} docName
 * @returns {Promise<{ indexed: boolean, chunks_count: number }>}
 */
async function indexDocument(docId, text, caseId, docName) {
  const chunks = chunkText(text);

  void docId;
  void caseId;
  void docName;

  // TODO: Create or reuse a ChromaDB collection and persist each chunk with metadata.
  // TODO: Store `doc_name`, `page`, `chunk_index`, and `case_id` so search can filter by case.

  return {
    indexed: false,
    chunks_count: chunks.length,
  };
}

/**
 * Search indexed chunks for a case.
 * @param {string} query
 * @param {string} caseId
 * @param {number} topK
 * @returns {Promise<Array<{ text: string, doc_name: string, page: number, chunk_index: number, score: number }>>}
 */
async function searchChunks(query, caseId, topK = 5) {
  void query;

  // TODO: Query ChromaDB with embeddings and filter by `case_id`.
  // TODO: Return ranked chunks including `text`, `doc_name`, `page`, `chunk_index`, and `score`.

  return [
    {
      text: `No indexed chunks are available yet for case ${caseId}.`,
      doc_name: 'placeholder.txt',
      page: 1,
      chunk_index: 0,
      score: 0,
    },
  ].slice(0, topK && topK > 0 ? topK : 1);
}

module.exports = {
  chunkText,
  indexDocument,
  searchChunks,
};
