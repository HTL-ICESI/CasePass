jest.mock('../src/services/ragService', () => ({
  indexDocument: jest.fn().mockResolvedValue({ chunks_indexed: 1, status: 'indexed' }),
  searchChunks: jest.fn().mockResolvedValue([{ text: 'Directions order made. Bundle deadline pending.', doc_name: 'order.pdf', page: 1, chunk_index: 0, score: 0.9 }]),
  getIndexedChunksForHandoff: jest.fn().mockResolvedValue([{ text: 'Directions order made. Bundle deadline pending.', doc_name: 'order.pdf', page: 1, chunk_index: 0, score: 0.9 }]),
}));
jest.mock('../src/services/claudeService', () => ({
  reviewMatter: jest.fn().mockResolvedValue({
    stage_of_proceedings: 'Directions stage [Doc: order.pdf, p.1]',
    most_recent_operative_event: 'Directions order made [Doc: order.pdf, p.1]',
    live_deadlines: ['Witness statements due [Doc: order.pdf, p.1]'],
    urgent_issues: ['Bundle not filed [Doc: order.pdf, p.1]'],
    missing_documents: [],
    next_procedural_step: 'Prepare bundle [Doc: order.pdf, p.1]',
    sources: [{ doc_name: 'order.pdf', page: 1, chunk_text: 'Directions order made', score: 0.9 }],
  }),
  generateHandoverNote: jest.fn().mockResolvedValue({
    executive_summary: 'Summary [Doc: order.pdf, p.1]',
    current_procedural_status: 'Status [Doc: order.pdf, p.1]',
    next_required_step: 'Next step [Doc: order.pdf, p.1]',
    live_deadlines: ['Deadline [Doc: order.pdf, p.1]'],
    risk_flags: ['Risk [Doc: order.pdf, p.1]'],
    task_scope: 'Prepare hearing',
    file_based_facts: ['Fact [Doc: order.pdf, p.1]'],
    strategic_notes: ['Strategic note: test'],
    sources: [{ doc_name: 'order.pdf', page: 1, chunk_text: 'Directions order made', score: 0.9 }],
  }),
  generateUpdateDraft: jest.fn().mockResolvedValue({
    what_was_done: 'Did work [Doc: order.pdf, p.1]',
    outcome: 'Outcome [Doc: order.pdf, p.1]',
    new_procedural_status: 'Status [Doc: order.pdf, p.1]',
    what_follows: 'Follow-up [Doc: order.pdf, p.1]',
    updated_deadlines: ['Deadline [Doc: order.pdf, p.1]'],
    sources: [{ doc_name: 'order.pdf', page: 1, chunk_text: 'Directions order made', score: 0.9 }],
  }),
  generateCaseSummary: jest.fn().mockResolvedValue('# Summary'),
}));

const request = require('supertest');
const { resetDomainData, createCase, createPdfFixture } = require('./helpers');
const { app } = require('../src/index');
const { query } = require('../src/db');

describe('handoff workflow routes', () => {
  let caseRow;
  let pdfPath;

  beforeEach(async () => {
    await resetDomainData();
    caseRow = await createCase(global.testContext.user1.id);
    pdfPath = createPdfFixture('Directions order with witness statement deadline and hearing listing.');
  });

  test('full structural handoff workflow works with guards and audit trail', async () => {
    const missing = await request(app)
      .post('/api/handoffs')
      .set('Authorization', `Bearer ${global.testContext.user1Token}`)
      .send({ intended_task: 'Prepare hearing' });

    const forbiddenCreate = await request(app)
      .post('/api/handoffs')
      .set('Authorization', `Bearer ${global.testContext.user2Token}`)
      .send({ case_id: caseRow.id, receiving_solicitor_id: global.testContext.user2.id, intended_task: 'Prepare hearing' });

    const created = await request(app)
      .post('/api/handoffs')
      .set('Authorization', `Bearer ${global.testContext.user1Token}`)
      .send({ case_id: caseRow.id, receiving_solicitor_id: global.testContext.user2.id, intended_task: 'Prepare hearing' });

    const handoffId = created.body.id;

    const senderClearance = await request(app)
      .post(`/api/handoffs/${handoffId}/clearance-records`)
      .set('Authorization', `Bearer ${global.testContext.user1Token}`)
      .send({
        conflict_check: true,
        confidentiality_clear: true,
        competence_confirmed: true,
        capacity_confirmed: true,
        rights_of_audience_confirmed: true,
        rights_of_audience_forum: 'county_court',
        result: 'approved',
        clearance_notes: 'ok',
      });

    const approvedClearance = await request(app)
      .post(`/api/handoffs/${handoffId}/clearance-records`)
      .set('Authorization', `Bearer ${global.testContext.user2Token}`)
      .send({
        conflict_check: true,
        confidentiality_clear: true,
        competence_confirmed: true,
        capacity_confirmed: true,
        rights_of_audience_confirmed: true,
        rights_of_audience_forum: 'county_court',
        result: 'approved',
        clearance_notes: 'ok',
      });

    if (approvedClearance.status !== 201) {
      // eslint-disable-next-line no-console
      console.log('approved clearance failure', approvedClearance.status, approvedClearance.body);
    }
    expect(approvedClearance.status).toBe(201);
    expect(approvedClearance.body.status).toBe('file_upload_open');

    const handoffRejected = await request(app)
      .post('/api/handoffs')
      .set('Authorization', `Bearer ${global.testContext.user1Token}`)
      .send({ case_id: caseRow.id, receiving_solicitor_id: global.testContext.user2.id, intended_task: 'Rejected route' });

    const rejectedClearance = await request(app)
      .post(`/api/handoffs/${handoffRejected.body.id}/clearance-records`)
      .set('Authorization', `Bearer ${global.testContext.user2Token}`)
      .send({
        conflict_check: true,
        confidentiality_clear: false,
        competence_confirmed: false,
        capacity_confirmed: false,
        rights_of_audience_confirmed: false,
        rights_of_audience_forum: 'county_court',
        result: 'rejected',
        clearance_notes: 'conflict risk',
      });

    const blockedAfterReject = await request(app)
      .post(`/api/handoffs/${handoffRejected.body.id}/pack-releases`)
      .set('Authorization', `Bearer ${global.testContext.user1Token}`);

    const authority = await request(app)
      .patch(`/api/handoffs/${handoffId}/representation`)
      .set('Authorization', `Bearer ${global.testContext.user1Token}`)
      .send({ handoff_type: 'full_solicitor_change' });

    const releaseWithoutNote = await request(app)
      .post(`/api/handoffs/${handoffId}/pack-releases`)
      .set('Authorization', `Bearer ${global.testContext.user1Token}`);

    const upload = await request(app)
      .post(`/api/handoffs/${handoffId}/documents`)
      .set('Authorization', `Bearer ${global.testContext.user1Token}`)
      .field('doc_type', 'pleading')
      .attach('file', pdfPath);

    if (upload.status !== 201) {
      // eslint-disable-next-line no-console
      console.log('handoff upload failure', upload.status, upload.body);
    }
    expect(upload.status).toBe(201);
    expect(upload.body).toHaveProperty('document');

    await query('UPDATE documents SET status = $2, chunks_count = 1 WHERE id = $1', [upload.body.document.id, 'indexed']);

    const review = await request(app)
      .post(`/api/handoffs/${handoffId}/matter-reviews`)
      .set('Authorization', `Bearer ${global.testContext.user1Token}`);

    const note = await request(app)
      .post(`/api/handoffs/${handoffId}/handover-notes`)
      .set('Authorization', `Bearer ${global.testContext.user1Token}`);

    const noteList = await request(app)
      .get(`/api/handoffs/${handoffId}/handover-notes`)
      .set('Authorization', `Bearer ${global.testContext.user1Token}`);

    const approvedNote = await request(app)
      .patch(`/api/handoffs/${handoffId}/handover-notes/${noteList.body[0].id}`)
      .set('Authorization', `Bearer ${global.testContext.user1Token}`)
      .send({ solicitor_edited: { approved: true, text: 'Approved note' } });

    const released = await request(app)
      .post(`/api/handoffs/${handoffId}/pack-releases`)
      .set('Authorization', `Bearer ${global.testContext.user1Token}`);

    const senderAccept = await request(app)
      .post(`/api/handoffs/${handoffId}/acceptances`)
      .set('Authorization', `Bearer ${global.testContext.user1Token}`)
      .send({ scope: 'limited', deadline_acknowledged: true });

    const accepted = await request(app)
      .post(`/api/handoffs/${handoffId}/acceptances`)
      .set('Authorization', `Bearer ${global.testContext.user2Token}`)
      .send({ scope: 'limited', deadline_acknowledged: true });

    const hearingRecording = await request(app)
      .post(`/api/handoffs/${handoffId}/hearing-notes`)
      .set('Authorization', `Bearer ${global.testContext.user2Token}`)
      .field('hearing_note_type', 'live_court_recording')
      .field('note_text', 'forbidden');

    const hearingNote = await request(app)
      .post(`/api/handoffs/${handoffId}/hearing-notes`)
      .set('Authorization', `Bearer ${global.testContext.user2Token}`)
      .field('hearing_note_type', 'typed_attendance_note')
      .field('note_text', 'typed note');

    const postAction = await request(app)
      .post(`/api/handoffs/${handoffId}/post-action-updates`)
      .set('Authorization', `Bearer ${global.testContext.user2Token}`)
      .send({
        what_was_done: 'Prepared attendance note',
        what_happened: 'Court adjourned',
        what_follows: 'Prepare evidence',
        new_procedural_status: 'Adjourned for directions',
      });

    const updateDraft = await request(app)
      .post(`/api/handoffs/${handoffId}/post-action-updates/${postAction.body.post_action_update.id}/drafts`)
      .set('Authorization', `Bearer ${global.testContext.user2Token}`);

    if (updateDraft.status !== 201) {
      // eslint-disable-next-line no-console
      console.log('update draft failure', updateDraft.status, updateDraft.body);
    }

    const verified = await request(app)
      .patch(`/api/handoffs/${handoffId}/post-action-updates/${postAction.body.post_action_update.id}`)
      .set('Authorization', `Bearer ${global.testContext.user2Token}`)
      .send({ verified_version: { final: true }, new_procedural_status: 'Directions given' });

    const routed = await request(app)
      .post(`/api/handoffs/${handoffId}/routing-decisions`)
      .set('Authorization', `Bearer ${global.testContext.user2Token}`)
      .send({ outcome: 'new_instructed_solicitor' });

    const continuity = await request(app)
      .get(`/api/handoffs/${handoffId}/continuity`)
      .set('Authorization', `Bearer ${global.testContext.user1Token}`);

    expect(missing.status).toBe(422);
    expect(forbiddenCreate.status).toBe(403);
    expect(created.status).toBe(201);
    expect(created.body.status).toBe('clearance_pending');
    expect(senderClearance.status).toBe(403);
    expect(approvedClearance.body.clearance_completed_at).toBeTruthy();
    expect(rejectedClearance.status).toBe(201);
    expect(rejectedClearance.body.status).toBe('clearance_failed');
    expect(blockedAfterReject.status).toBe(409);
    expect(authority.status).toBe(200);
    expect(authority.body.notice_of_change_required).toBe(true);
    expect(releaseWithoutNote.status).toBe(409);
    expect(review.status).toBe(201);
    expect(note.status).toBe(201);
    expect(approvedNote.status).toBe(200);
    expect(released.status).toBe(201);
    expect(released.body.status).toBe('pack_released');
    expect(senderAccept.status).toBe(403);
    expect(accepted.status).toBe(201);
    expect(accepted.body.status).toBe('task_in_progress');
    expect(hearingRecording.status).toBe(403);
    expect(hearingRecording.body.code).toBe('RECORDING_PROHIBITED');
    expect(hearingNote.status).toBe(201);
    expect(postAction.status).toBe(201);
    expect(updateDraft.status).toBe(201);
    expect(verified.status).toBe(200);
    expect(verified.body.post_action_update.ai_draft).not.toBeNull();
    expect(verified.body.post_action_update.verified_version).not.toBeNull();
    expect(routed.status).toBe(201);
    expect(routed.body.status).toBe('completed');
    expect(routed.body.n434_reminder).toContain('N434');
    expect(continuity.status).toBe(200);
    expect(continuity.body.audit_trail.length).toBeGreaterThan(0);
    expect(continuity.body.matter_snapshots.length).toBeGreaterThan(0);
    expect(Array.isArray(continuity.body.source_register)).toBe(true);
  });
});
