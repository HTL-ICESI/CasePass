const request = require('supertest');
const { resetDomainData, createCase, createHandoff } = require('./helpers');
const { app } = require('../src/index');
const { query } = require('../src/db');

describe('share routes', () => {
  beforeEach(async () => {
    await resetDomainData();
  });

  test('share and read shared case with restricted fields', async () => {
    const caseRow = await createCase(global.testContext.user1.id, { strategic_notes: 'Do not share', solicitor_notes: 'Internal only' });
    const handoff = await createHandoff(caseRow.id, global.testContext.user1.id, global.testContext.user2.id, { status: 'pack_released', clearance_result: 'approved' });
    await query(
      `INSERT INTO handover_notes (handoff_id, ai_draft, version_number, approved_at) VALUES ($1, $2, 1, NOW())`,
      [handoff.id, JSON.stringify({ executive_summary: 'Shared note.' })],
    );

    const create = await request(app)
      .post(`/api/cases/${caseRow.id}/share`)
      .set('Authorization', `Bearer ${global.testContext.user1Token}`)
      .send({});

    const forbidden = await request(app)
      .post(`/api/cases/${caseRow.id}/share`)
      .set('Authorization', `Bearer ${global.testContext.user2Token}`)
      .send({});

    const shared = await request(app).get(`/api/shared/${create.body.token}`);

    expect(create.status).toBe(200);
    expect(create.body.url).toContain('/shared/');
    expect(forbidden.status).toBe(403);
    expect(shared.status).toBe(200);
    expect(shared.body.strategic_notes).toBeUndefined();
    expect(shared.body.audit_events).toBeUndefined();
  });

  test('expired and invalid share tokens return correct status', async () => {
    const caseRow = await createCase(global.testContext.user1.id);
    const sharedLink = (await query(
      `INSERT INTO shared_links (case_id, created_by, expires_at) VALUES ($1, $2, NOW() - interval '1 day') RETURNING *`,
      [caseRow.id, global.testContext.user1.id],
    )).rows[0];

    const expired = await request(app).get(`/api/shared/${sharedLink.token}`);
    const missing = await request(app).get('/api/shared/00000000-0000-0000-0000-000000000000');

    expect(expired.status).toBe(403);
    expect(missing.status).toBe(404);
  });
});
