jest.mock('../src/services/ragService', () => ({
  searchChunks: jest.fn(),
}));
jest.mock('../src/services/claudeService', () => ({
  chatWithSources: jest.fn(),
}));

const request = require('supertest');
const { searchChunks } = require('../src/services/ragService');
const { chatWithSources } = require('../src/services/claudeService');
const { resetDomainData, createCase, createHandoff } = require('./helpers');
const { app } = require('../src/index');

describe('chat routes', () => {
  beforeEach(async () => {
    await resetDomainData();
    jest.clearAllMocks();
  });

  test('chat enforces auth, validation, pack release, empty results, and successful sourced answers', async () => {
    const caseRow = await createCase(global.testContext.user1.id);
    const handoff = await createHandoff(caseRow.id, global.testContext.user1.id, global.testContext.user2.id, { status: 'clearance_pending' });

    const unauthenticated = await request(app).post(`/api/cases/${caseRow.id}/chat`).send({ question: 'What next?' });
    const invalid = await request(app).post(`/api/cases/${caseRow.id}/chat`).set('Authorization', `Bearer ${global.testContext.user1Token}`).send({});
    const unreleased = await request(app)
      .post(`/api/cases/${caseRow.id}/chat`)
      .set('Authorization', `Bearer ${global.testContext.user1Token}`)
      .send({ question: 'What next?', handoff_id: handoff.id });

    await require('../src/db').query('UPDATE handoffs SET status = $2 WHERE id = $1', [handoff.id, 'pack_released']);
    searchChunks.mockResolvedValueOnce([]);
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
    expect(unreleased.status).toBe(403);
    expect(unreleased.body.code).toBe('PACK_NOT_RELEASED');
    expect(empty.status).toBe(200);
    expect(empty.body.answer).toBe('Insufficient evidence in the file to answer this question.');
    expect(success.status).toBe(200);
    expect(success.body.sources[0]).toMatchObject({ doc_name: 'order.pdf', page: 3, score: 0.9 });
  });
});
