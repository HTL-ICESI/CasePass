const request = require('supertest');
const { resetDomainData, createCase, createHandoff } = require('./helpers');
const { query } = require('../src/db');
const { app } = require('../src/index');

describe('cases routes', () => {
  beforeEach(async () => {
    await resetDomainData();
  });

  test('POST /api/cases without auth returns 401', async () => {
    const response = await request(app).post('/api/cases').send({});
    expect(response.status).toBe(401);
  });

  test('POST /api/cases missing required fields returns 422', async () => {
    const response = await request(app)
      .post('/api/cases')
      .set('Authorization', `Bearer ${global.testContext.user1Token}`)
      .send({ case_title: 'Only title' });

    expect(response.status).toBe(422);
    expect(response.body.field_errors).toHaveProperty('claimant');
    expect(response.body.field_errors).toHaveProperty('defendant');
    expect(response.body.field_errors).toHaveProperty('forum');
    expect(response.body.field_errors).toHaveProperty('urgency');
  });

  test('POST /api/cases with invalid forum value returns 422', async () => {
    const response = await request(app)
      .post('/api/cases')
      .set('Authorization', `Bearer ${global.testContext.user1Token}`)
      .send({ case_title: 'Bad forum', claimant: 'A', defendant: 'B', forum: 'invalid_forum', urgency: 'urgent' });

    expect(response.status).toBe(422);
    expect(response.body.field_errors).toHaveProperty('forum');
  });

  test('POST /api/cases with required fields returns full case object', async () => {
    const response = await request(app)
      .post('/api/cases')
      .set('Authorization', `Bearer ${global.testContext.user1Token}`)
      .send({
        case_title: 'Example matter',
        claimant: 'Claimant Ltd',
        defendant: 'Defendant Ltd',
        forum: 'county_court',
        urgency: 'urgent',
        claim_number: 'CLM-123',
        track: 'fast_track',
        next_hearing_date: '2026-06-20',
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(expect.objectContaining({
      case_title: 'Example matter',
      claim_number: 'CLM-123',
      claimant: 'Claimant Ltd',
      defendant: 'Defendant Ltd',
      forum: 'county_court',
      track: 'fast_track',
      created_by: global.testContext.user1.id,
      solicitor_on_record_id: global.testContext.user1.id,
    }));
    expect(response.body).toHaveProperty('forum');
    expect(response.body).toHaveProperty('ruleset');
    expect(response.body).toHaveProperty('part7_or_part8');
    expect(response.body).toHaveProperty('track');
    expect(response.body).toHaveProperty('issue_date');
    expect(response.body).toHaveProperty('next_hearing_type');
    expect(response.body).toHaveProperty('disclosure_regime');
    expect(response.body).toHaveProperty('witness_statements_status');
    expect(response.body).toHaveProperty('costs_regime');
    expect(response.body).toHaveProperty('n434_status');
    expect(response.body).toHaveProperty('human_verified');
    expect(response.body).toHaveProperty('forum_uncertain');
    expect(response.body).toHaveProperty('solicitor_notes');
    expect(response.body.share_token).toMatch(/[0-9a-f-]{36}/i);
  });

  test('GET /api/cases returns only accessible cases and supports search/filter', async () => {
    await createCase(global.testContext.user1.id, { case_title: 'Alpha matter', forum: 'county_court', urgency: 'urgent' });
    await createCase(global.testContext.user2.id, { case_title: 'Beta matter', forum: 'employment_tribunal', urgency: 'routine' });

    const all = await request(app).get('/api/cases').set('Authorization', `Bearer ${global.testContext.user1Token}`);
    const search = await request(app).get('/api/cases?search=Alpha').set('Authorization', `Bearer ${global.testContext.user1Token}`);
    const filter = await request(app).get('/api/cases?forum=county_court').set('Authorization', `Bearer ${global.testContext.user1Token}`);

    expect(all.status).toBe(200);
    expect(all.body).toHaveLength(1);
    expect(search.body).toHaveLength(1);
    expect(filter.body.every((item) => item.forum === 'county_court')).toBe(true);
  });

  test('GET /api/cases/:id returns 200, 403, and 404 correctly', async () => {
    const caseRow = await createCase(global.testContext.user1.id);
    const own = await request(app).get(`/api/cases/${caseRow.id}`).set('Authorization', `Bearer ${global.testContext.user1Token}`);
    const forbidden = await request(app).get(`/api/cases/${caseRow.id}`).set('Authorization', `Bearer ${global.testContext.user2Token}`);
    const missing = await request(app).get('/api/cases/00000000-0000-0000-0000-000000000000').set('Authorization', `Bearer ${global.testContext.user1Token}`);

    expect(own.status).toBe(200);
    expect(own.body.active_handoff_summary).toBeNull();
    expect(own.body.documents).toEqual([]);
    expect(forbidden.status).toBe(403);
    expect(missing.status).toBe(404);
  });

  test('PUT /api/cases/:id updates and validates track', async () => {
    const caseRow = await createCase(global.testContext.user1.id);

    const updated = await request(app)
      .put(`/api/cases/${caseRow.id}`)
      .set('Authorization', `Bearer ${global.testContext.user1Token}`)
      .send({ case_title: 'Updated case title', track: 'multi_track' });

    const forbidden = await request(app)
      .put(`/api/cases/${caseRow.id}`)
      .set('Authorization', `Bearer ${global.testContext.user2Token}`)
      .send({ case_title: 'Should fail' });

    const invalid = await request(app)
      .put(`/api/cases/${caseRow.id}`)
      .set('Authorization', `Bearer ${global.testContext.user1Token}`)
      .send({ track: 'wrong_track' });

    expect(updated.status).toBe(200);
    expect(updated.body.case_title).toBe('Updated case title');
    expect(forbidden.status).toBe(403);
    expect(invalid.status).toBe(422);
  });

  test('DELETE /api/cases/:id blocks active handoffs and allows owner deletion', async () => {
    const caseWithHandoff = await createCase(global.testContext.user1.id);
    await createHandoff(caseWithHandoff.id, global.testContext.user1.id, global.testContext.user2.id, { status: 'pack_released', clearance_result: 'approved' });

    const blocked = await request(app)
      .delete(`/api/cases/${caseWithHandoff.id}`)
      .set('Authorization', `Bearer ${global.testContext.user1Token}`);

    const caseRow = await createCase(global.testContext.user1.id, { case_title: 'Delete me' });
    const caseForbidden = await createCase(global.testContext.user1.id, { case_title: 'Forbidden delete' });
    const deleted = await request(app)
      .delete(`/api/cases/${caseRow.id}`)
      .set('Authorization', `Bearer ${global.testContext.user1Token}`);

    const forbidden = await request(app)
      .delete(`/api/cases/${caseForbidden.id}`)
      .set('Authorization', `Bearer ${global.testContext.user2Token}`);

    expect(blocked.status).toBe(409);
    expect(deleted.status).toBe(200);
    expect(forbidden.status).toBe(403);

    const audit = await query('SELECT * FROM audit_events WHERE entity_type = $1 AND entity_id = $2', ['case', caseRow.id]);
    expect(audit.rows.some((event) => event.event_type === 'case_updated')).toBe(false);
  });
});
