jest.mock('../src/services/ragService', () => ({
  indexDocument: jest.fn().mockResolvedValue({ chunks_indexed: 1, status: 'indexed' }),
}));

const request = require('supertest');
const { resetDomainData, createCase, createHandoff, createPdfFixture } = require('./helpers');
const { app } = require('../src/index');
const { query } = require('../src/db');

describe('documents routes', () => {
  beforeEach(async () => {
    await resetDomainData();
  });

  test('case document upload enforces auth, pdf validation, clearance gate, list and delete rules', async () => {
    const caseRow = await createCase(global.testContext.user1.id);
    const pdfPath = createPdfFixture('County Court pleading for upload test.');

    const unauthenticated = await request(app)
      .post(`/api/cases/${caseRow.id}/documents`)
      .attach('file', pdfPath);

    const nonPdfPath = `${pdfPath}.txt`;
    require('fs').writeFileSync(nonPdfPath, 'plain text');
    const nonPdf = await request(app)
      .post(`/api/cases/${caseRow.id}/documents`)
      .set('Authorization', `Bearer ${global.testContext.user1Token}`)
      .attach('file', nonPdfPath);

    await createHandoff(caseRow.id, global.testContext.user1.id, global.testContext.user2.id, { status: 'clearance_pending' });
    const blocked = await request(app)
      .post(`/api/cases/${caseRow.id}/documents`)
      .set('Authorization', `Bearer ${global.testContext.user1Token}`)
      .attach('file', pdfPath);

    await query('DELETE FROM handoffs WHERE case_id = $1', [caseRow.id]);
    const openHandoff = await createHandoff(caseRow.id, global.testContext.user1.id, global.testContext.user2.id, { status: 'file_upload_open', clearance_result: 'approved' });
    const uploaded = await request(app)
      .post(`/api/cases/${caseRow.id}/documents`)
      .set('Authorization', `Bearer ${global.testContext.user1Token}`)
      .field('doc_type', 'pleading')
      .attach('file', pdfPath);

    const list = await request(app)
      .get(`/api/cases/${caseRow.id}/documents`)
      .set('Authorization', `Bearer ${global.testContext.user1Token}`);

    const forbiddenDelete = await request(app)
      .delete(`/api/documents/${uploaded.body.id}`)
      .set('Authorization', `Bearer ${global.testContext.user2Token}`);

    await query('UPDATE handoffs SET status = $2 WHERE id = $1', [openHandoff.id, 'completed']);
    const allowedDelete = await request(app)
      .delete(`/api/documents/${uploaded.body.id}`)
      .set('Authorization', `Bearer ${global.testContext.user1Token}`);

    expect(unauthenticated.status).toBe(401);
    expect(nonPdf.status).toBe(422);
    expect(blocked.status).toBe(403);
    expect(blocked.body.code).toBe('CLEARANCE_GATE_BLOCKED');
    expect(uploaded.status).toBe(201);
    expect(uploaded.body.status).toBe('pending');
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body)).toBe(true);
    expect(forbiddenDelete.status).toBe(403);
    expect(allowedDelete.status).toBe(200);
  });
});
