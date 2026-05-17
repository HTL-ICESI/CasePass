jest.mock('../src/services/ragService', () => ({
  searchChunks: jest.fn(),
  getIndexedChunksForHandoff: jest.fn(),
  getTopicSearchChunks: jest.fn(),
}));
jest.mock('../src/services/claudeService', () => ({
  chatWithSources: jest.fn(),
  streamChatWithSources: jest.fn(),
}));

const request = require('supertest');
const { searchChunks, getIndexedChunksForHandoff, getTopicSearchChunks } = require('../src/services/ragService');
const { chatWithSources, streamChatWithSources } = require('../src/services/claudeService');
const { resetDomainData, createCase, createHandoff } = require('./helpers');
const { app } = require('../src/index');

describe('chat routes', () => {
  beforeEach(async () => {
    await resetDomainData();
    jest.clearAllMocks();
    getIndexedChunksForHandoff.mockResolvedValue([]);
    getTopicSearchChunks.mockResolvedValue([]);
  });

  test('chat enforces auth, validation, receiver release gate, empty results, and successful sourced answers', async () => {
    const caseRow = await createCase(global.testContext.user1.id);
    const handoff = await createHandoff(caseRow.id, global.testContext.user1.id, global.testContext.user2.id, { status: 'clearance_pending' });

    const unauthenticated = await request(app).post(`/api/cases/${caseRow.id}/chat`).send({ question: 'What next?' });
    const invalid = await request(app).post(`/api/cases/${caseRow.id}/chat`).set('Authorization', `Bearer ${global.testContext.user1Token}`).send({});
    searchChunks.mockResolvedValueOnce([]);
    getIndexedChunksForHandoff.mockResolvedValueOnce([]);
    const senderUnreleased = await request(app)
      .post(`/api/cases/${caseRow.id}/chat`)
      .set('Authorization', `Bearer ${global.testContext.user1Token}`)
      .send({ question: 'What next?', handoff_id: handoff.id });

    const receiverUnreleased = await request(app)
      .post(`/api/cases/${caseRow.id}/chat`)
      .set('Authorization', `Bearer ${global.testContext.user2Token}`)
      .send({ question: 'What next?', handoff_id: handoff.id });

    await require('../src/db').query('UPDATE handoffs SET status = $2 WHERE id = $1', [handoff.id, 'pack_released']);
    searchChunks.mockResolvedValueOnce([]);
    getIndexedChunksForHandoff.mockResolvedValueOnce([]);
    const empty = await request(app)
      .post(`/api/cases/${caseRow.id}/chat`)
      .set('Authorization', `Bearer ${global.testContext.user1Token}`)
      .send({ question: 'What next?', handoff_id: handoff.id });

    searchChunks.mockResolvedValueOnce([{ text: 'Order made.', doc_name: 'order.pdf', page: 3, chunk_index: 0, score: 0.9 }]);
    chatWithSources.mockResolvedValueOnce({ answer: 'Order made. [Doc: order.pdf, p.3]', sources: [{ doc_name: 'order.pdf', page: 3, chunk_text: 'Order made.', score: 0.9 }] });
    const success = await request(app)
      .post(`/api/cases/${caseRow.id}/chat`)
      .set('Authorization', `Bearer ${global.testContext.user1Token}`)
      .send({ question: 'What next?', handoff_id: handoff.id });

    expect(unauthenticated.status).toBe(401);
    expect(invalid.status).toBe(422);
    expect(senderUnreleased.status).toBe(200);
    expect(senderUnreleased.body.answer).toBe('Insufficient evidence in the file to answer this question.');
    expect(receiverUnreleased.status).toBe(403);
    expect(receiverUnreleased.body.code).toBe('PACK_NOT_RELEASED');
    expect(empty.status).toBe(200);
    expect(empty.body.answer).toBe('Insufficient evidence in the file to answer this question.');
    expect(success.status).toBe(200);
    expect(success.body.sources[0]).toMatchObject({ doc_name: 'order.pdf', page: 3, score: 0.9 });
  });

  test('streaming chat sends SSE deltas and uses recent conversation for retrieval', async () => {
    const caseRow = await createCase(global.testContext.user1.id);
    const handoff = await createHandoff(caseRow.id, global.testContext.user1.id, global.testContext.user2.id, { status: 'pack_released' });
    const chunks = [{ text: 'The next hearing is 16 June 2026.', doc_name: 'order.pdf', page: 3, chunk_index: 0, score: 0.9 }];

    searchChunks.mockResolvedValueOnce(chunks);
    streamChatWithSources.mockImplementationOnce(async (_question, _chunks, _context, onToken) => {
      onToken('The next step ');
      onToken('is to prepare for the hearing. ');
      return {
        answer: 'The next step is to prepare for the hearing. [Doc: order.pdf, p.3]',
        sources: [{ doc_name: 'order.pdf', page: 3, chunk_text: chunks[0].text, score: 0.9 }],
      };
    });

    const streamed = await request(app)
      .post(`/api/cases/${caseRow.id}/chat/stream`)
      .set('Authorization', `Bearer ${global.testContext.user1Token}`)
      .send({
        question: 'And what do I have to do?',
        handoff_id: handoff.id,
        conversation_history: [
          { role: 'user', text: 'What is next?' },
          { role: 'assistant', text: 'The next hearing is 16 June 2026. [Doc: order.pdf, p.3]' },
        ],
      });

    expect(streamed.status).toBe(200);
    expect(streamed.headers['content-type']).toContain('text/event-stream');
    expect(streamed.text).toContain('event: delta');
    expect(streamed.text).toContain('event: final');
    expect(searchChunks.mock.calls[0][0]).toContain('16 June 2026');
    expect(streamChatWithSources.mock.calls[0][2].conversation_history).toHaveLength(2);
  });
});
