const test = require('node:test');
const assert = require('node:assert/strict');

const { buildPageMap, chunkText } = require('../src/services/ragService');

test('buildPageMap creates cumulative page offsets', () => {
  const pageMap = buildPageMap([
    { pageNum: 1, text: 'Alpha page.' },
    { pageNum: 2, text: 'Beta page.' },
  ]);

  assert.deepEqual(pageMap, [
    { page: 1, char_offset: 0 },
    { page: 2, char_offset: 'Alpha page.\n'.length },
  ]);
});

test('chunkText keeps sentence boundaries and returns metadata-rich chunks', () => {
  const text = 'Sentence one. Sentence two is here. Sentence three closes the paragraph.';
  const pageMap = [{ page: 1, char_offset: 0 }];
  const chunks = chunkText(text, 'bundle.pdf', pageMap, 4, 1);

  assert.equal(Array.isArray(chunks), true);
  assert.equal(chunks.length >= 2, true);
  assert.equal(chunks[0].text.endsWith('.'), true);
  assert.equal(chunks[0].metadata.doc_name, 'bundle.pdf');
  assert.equal(chunks[0].metadata.page, 1);
  assert.equal(typeof chunks[0].metadata.char_start, 'number');
  assert.equal(typeof chunks[0].metadata.char_end, 'number');
  assert.equal(typeof chunks[0].metadata.token_estimate, 'number');
});

test('chunkText splits oversized extracted text instead of returning a single overlong chunk', () => {
  const longSegment = Array.from({ length: 700 }, (_, index) => `word${index}`).join(' ');
  const text = `${longSegment}.`;
  const pageMap = [{ page: 1, char_offset: 0 }];
  const chunks = chunkText(text, 'n1-form.pdf', pageMap, 220, 20);

  assert.equal(chunks.length > 1, true);
  assert.equal(chunks.every((chunk) => chunk.metadata.token_estimate <= 240), true);
  assert.equal(chunks[0].metadata.doc_name, 'n1-form.pdf');
});
