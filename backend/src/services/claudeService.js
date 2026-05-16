/**
 * Build a Claude prompt with numbered context blocks and return a placeholder answer.
 * @param {string} question
 * @param {Array<{ text: string, doc_name: string, page: number, chunk_index: number, score: number }>} chunks
 * @returns {Promise<{ answer: string, sources: Array<{ doc_name: string, page: number, chunk_text: string, score: number }> }>}
 */
async function chatWithSources(question, chunks) {
  const numberedContext = chunks
    .map((chunk, index) => `[${index + 1}] ${chunk.doc_name} page ${chunk.page}\n${chunk.text}`)
    .join('\n\n');

  const prompt = [
    'You are a legal case assistant.',
    'Answer the user using the context blocks below.',
    'Cite supporting blocks as [1], [2], and so on.',
    '',
    `Question: ${question}`,
    '',
    'Context:',
    numberedContext,
  ].join('\n');

  void prompt;

  // TODO: Call Claude model `claude-sonnet-4-20250514` with the numbered prompt above.
  // TODO: Parse citations from the model response and map them back to the source objects.

  return {
    answer: chunks.length
      ? `This is a placeholder answer for: ${question} [1]`
      : `This is a placeholder answer for: ${question}`,
    sources: chunks.map((chunk) => ({
      doc_name: chunk.doc_name,
      page: chunk.page,
      chunk_text: chunk.text,
      score: chunk.score,
    })),
  };
}

/**
 * Generate a markdown summary for a case.
 * @param {object} caseData
 * @returns {Promise<string>}
 */
async function generateCaseSummary(caseData) {
  // TODO: Replace this scaffold summary with a Claude-generated case summary.
  return `# Resumen del Caso\n\n- Nombre: ${caseData.name || 'Sin nombre'}\n- Radicado: ${caseData.radicado || 'Sin radicado'}\n- Ultima actuacion: ${caseData.last_action || 'Sin informacion'}\n- Proxima actuacion: ${caseData.next_action || 'Sin informacion'}`;
}

module.exports = {
  chatWithSources,
  generateCaseSummary,
};
