const test = require('node:test');
const assert = require('node:assert/strict');

const { reviewMatter, __test__ } = require('../src/services/claudeService');

test('reviewMatter rejects empty chunk lists', async () => {
  await assert.rejects(
    () => reviewMatter('handoff-1', [], {
      case_name: 'Test Matter',
      matter_type: 'Civil claim',
      court: 'County Court',
      parties: 'A v B',
      last_known_action: 'Order served',
      next_hearing_date: '2026-05-20',
    }),
    (error) => {
      assert.equal(error.code, 'NO_CHUNKS_FOUND');
      return true;
    },
  );
});

test('stripMarkdownFences returns raw JSON payload', () => {
  const parsed = __test__.stripMarkdownFences('```json\n{"value":1}\n```');
  assert.equal(parsed, '{"value":1}');
});
