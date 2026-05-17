const fs = require('fs');
const path = require('path');
const { query, withTransaction } = require('../db');
const { logEvent, getHandoffAuditTrail, getCaseTimeline } = require('./auditService');
const { assertValidTransition } = require('./stateMachine');
const { snapshotMatterStatus, getStatusHistory } = require('./matterStatusService');

const HANDOFF_TYPES = new Set([
  'internal_reassignment',
  'external_agent',
  'advocacy_hearing_only',
  'full_solicitor_change',
]);
const CLEARANCE_RESULTS = new Set(['approved', 'rejected']);
const TASK_SCOPES = new Set(['limited', 'continuing']);
const ROUTING_OUTCOMES = new Set(['returned', 'limited_followon', 'new_instructed_solicitor', 'escalated']);
const HEARING_NOTE_TYPES = {
  typed_attendance_note: 'attendance_note',
  post_hearing_dictation: 'attendance_note',
  official_transcript_import: 'transcript',
};
const TERMINAL_STATUSES = new Set(['clearance_failed', 'completed', 'escalated']);
const CIVIL_FORUMS = new Set([
  'county_court',
  'high_court_kbd',
  'high_court_chancery',
  'high_court_family',
  'court_of_appeal_civil',
]);

function createHandoffError(message, code, statusCode = 400, extra = {}) {
  return Object.assign(new Error(message), { code, statusCode, ...extra });
}

function getRunner(client) {
  return client || { query };
}

function requireFields(payload, fields) {
  const fieldErrors = {};

  for (const field of fields) {
    if (payload[field] === undefined || payload[field] === null || payload[field] === '') {
      fieldErrors[field] = 'This field is required.';
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw createHandoffError('Validation failed.', 'VALIDATION_ERROR', 422, { field_errors: fieldErrors });
  }
}

function normaliseJson(value) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (_error) {
      return value;
    }
  }

  return value;
}

async function getCaseRow(caseId, client = null) {
  const runner = getRunner(client);
  const result = await runner.query('SELECT * FROM cases WHERE id = $1', [caseId]);

  if (!result.rows[0]) {
    throw createHandoffError('Case not found.', 'CASE_NOT_FOUND', 404);
  }

  return result.rows[0];
}

async function assertCaseOwnerOrSolicitor(caseId, actorId, client = null) {
  const caseRow = await getCaseRow(caseId, client);

  if (caseRow.created_by !== actorId && caseRow.solicitor_on_record_id !== actorId) {
    throw createHandoffError('Only the case creator or solicitor on record may perform this action.', 'FORBIDDEN', 403);
  }

  return caseRow;
}

async function getHandoffRow(handoffId, client = null) {
  const runner = getRunner(client);
  const result = await runner.query('SELECT * FROM handoffs WHERE id = $1', [handoffId]);

  if (!result.rows[0]) {
    throw createHandoffError('Handoff not found.', 'HANDOFF_NOT_FOUND', 404);
  }

  return result.rows[0];
}

function assertSenderActor(handoff, actorId) {
  if (handoff.sending_solicitor_id !== actorId) {
    throw createHandoffError('Only the sending solicitor may perform this step.', 'FORBIDDEN', 403);
  }
}

function assertReceiverActor(handoff, actorId) {
  if (handoff.receiving_solicitor_id !== actorId) {
    throw createHandoffError('Only the receiving solicitor may perform this step.', 'FORBIDDEN', 403);
  }
}

function assertReadable(handoff, actorId, role = 'user') {
  if (role === 'admin') {
    return;
  }

  if (handoff.sending_solicitor_id !== actorId && handoff.receiving_solicitor_id !== actorId) {
    throw createHandoffError('You do not have access to this handoff.', 'FORBIDDEN', 403);
  }
}

async function changeStatus(client, handoff, nextStatus, actorId, eventType, metadata = {}) {
  await assertValidTransition(handoff.status, nextStatus, {
    entityId: handoff.id,
    actorId,
    client,
  });

  const result = await client.query(
    `
      UPDATE handoffs
      SET status = $2,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [handoff.id, nextStatus],
  );

  await logEvent('handoff', handoff.id, eventType, actorId, handoff.status, nextStatus, metadata, client);
  return result.rows[0];
}

async function getLatestHandoverNote(handoffId, client = null) {
  const runner = getRunner(client);
  const result = await runner.query(
    `
      SELECT *
      FROM handover_notes
      WHERE handoff_id = $1
      ORDER BY version_number DESC, created_at DESC
      LIMIT 1
    `,
    [handoffId],
  );

  return result.rows[0] || null;
}

async function getHandoverNoteById(handoffId, noteId, client = null) {
  const runner = getRunner(client);
  const result = await runner.query('SELECT * FROM handover_notes WHERE id = $1 AND handoff_id = $2', [noteId, handoffId]);

  if (!result.rows[0]) {
    throw createHandoffError('Handover note not found.', 'HANDOVER_NOTE_NOT_FOUND', 404);
  }

  return result.rows[0];
}

async function getPostActionUpdateById(updateId, handoffId, client = null) {
  const runner = getRunner(client);
  const result = await runner.query('SELECT * FROM post_action_updates WHERE id = $1 AND handoff_id = $2', [updateId, handoffId]);

  if (!result.rows[0]) {
    throw createHandoffError('Post-action update not found.', 'POST_ACTION_NOT_FOUND', 404);
  }

  return result.rows[0];
}

function toTerminalStatus(outcome) {
  return outcome === 'escalated' ? 'escalated' : 'completed';
}

async function createHandoff(senderId, caseId, metadata) {
  requireFields(metadata, ['case_id', 'receiving_solicitor_id', 'intended_task']);

  return withTransaction(async (client) => {
    const caseRow = await assertCaseOwnerOrSolicitor(caseId, senderId, client);
    const result = await client.query(
      `
        INSERT INTO handoffs (
          case_id,
          sending_solicitor_id,
          receiving_solicitor_id,
          intended_task,
          status
        )
        VALUES ($1, $2, $3, $4, 'draft')
        RETURNING *
      `,
      [caseId, senderId, metadata.receiving_solicitor_id, metadata.intended_task],
    );

    const draft = result.rows[0];
    await logEvent('handoff', draft.id, 'handoff_created', senderId, null, 'draft', { case_id: caseId }, client);
    const clearancePending = await changeStatus(client, draft, 'clearance_pending', senderId, 'handoff_submitted_for_clearance', {
      case_title: caseRow.case_title,
    });
    return clearancePending;
  });
}

async function submitClearance(handoffId, clearancePayload, actorId) {
  requireFields(clearancePayload, [
    'conflict_check',
    'confidentiality_clear',
    'competence_confirmed',
    'capacity_confirmed',
    'rights_of_audience_confirmed',
    'result',
  ]);

  if (!CLEARANCE_RESULTS.has(clearancePayload.result)) {
    throw createHandoffError('Invalid clearance result.', 'VALIDATION_ERROR', 422, {
      field_errors: { result: 'Must be approved or rejected.' },
    });
  }

  return withTransaction(async (client) => {
    const handoff = await getHandoffRow(handoffId, client);
    assertReceiverActor(handoff, actorId);
    const nextStatus = clearancePayload.result === 'approved' ? 'file_upload_open' : 'clearance_failed';

    await client.query(
      `
        UPDATE handoffs
        SET rights_of_audience_verified = $2,
            rights_of_audience_forum = $3,
            clearance_result = $4::text,
            clearance_notes = $5,
            clearance_completed_at = CASE WHEN $4::text = 'approved' THEN NOW() ELSE clearance_completed_at END,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        handoffId,
        Boolean(clearancePayload.rights_of_audience_confirmed),
        clearancePayload.rights_of_audience_forum || null,
        clearancePayload.result,
        clearancePayload.clearance_notes || null,
      ],
    );

    const refreshed = await getHandoffRow(handoffId, client);
    return changeStatus(client, refreshed, nextStatus, actorId, 'handoff_clearance_submitted', {
      conflict_check: clearancePayload.conflict_check,
      confidentiality_clear: clearancePayload.confidentiality_clear,
      competence_confirmed: clearancePayload.competence_confirmed,
      capacity_confirmed: clearancePayload.capacity_confirmed,
      rights_of_audience_confirmed: clearancePayload.rights_of_audience_confirmed,
      rights_of_audience_forum: clearancePayload.rights_of_audience_forum || null,
      clearance_notes: clearancePayload.clearance_notes || null,
    });
  });
}

async function setRepresentationType(handoffId, handoffType, actorId) {
  if (!HANDOFF_TYPES.has(handoffType)) {
    throw createHandoffError('Invalid handoff type.', 'VALIDATION_ERROR', 422, {
      field_errors: { handoff_type: 'Invalid handoff type.' },
    });
  }

  return withTransaction(async (client) => {
    const handoff = await getHandoffRow(handoffId, client);
    assertSenderActor(handoff, actorId);

    if (!['clearance_pending', 'file_upload_open'].includes(handoff.status)) {
      throw createHandoffError('Representation can only be updated before pack building.', 'INVALID_TRANSITION', 409, {
        current_status: handoff.status,
        attempted_status: handoff.status,
        allowed_next: ['clearance_pending', 'file_upload_open'],
      });
    }

    const caseRow = await getCaseRow(handoff.case_id, client);
    const noticeRequired = handoffType === 'full_solicitor_change' && CIVIL_FORUMS.has(caseRow.forum);
    const result = await client.query(
      `
        UPDATE handoffs
        SET handoff_type = $2,
            notice_of_change_required = $3,
            n434_triggered = $4,
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [handoffId, handoffType, noticeRequired, noticeRequired],
    );

    if (noticeRequired) {
      await client.query(
        `
          UPDATE cases
          SET n434_status = 'pending',
              updated_at = NOW()
          WHERE id = $1
        `,
        [handoff.case_id],
      );
    }

    await logEvent('handoff', handoffId, 'handoff_representation_updated', actorId, handoff.status, handoff.status, {
      handoff_type: handoffType,
      notice_of_change_required: noticeRequired,
    }, client);

    return result.rows[0];
  });
}

async function setComplianceHold(handoffId, actorId, reason) {
  return withTransaction(async (client) => {
    const handoff = await getHandoffRow(handoffId, client);
    assertSenderActor(handoff, actorId);
    await client.query(
      `
        UPDATE handoffs
        SET compliance_hold_reason = $2,
            updated_at = NOW()
        WHERE id = $1
      `,
      [handoffId, reason || 'Compliance review required.'],
    );
    const refreshed = await getHandoffRow(handoffId, client);
    return changeStatus(client, refreshed, 'compliance_hold', actorId, 'handoff_compliance_hold_applied', {
      compliance_hold_reason: reason || 'Compliance review required.',
    });
  });
}

async function clearComplianceHold(handoffId, actorId) {
  return withTransaction(async (client) => {
    const handoff = await getHandoffRow(handoffId, client);
    assertSenderActor(handoff, actorId);
    return changeStatus(client, handoff, 'file_upload_open', actorId, 'handoff_compliance_hold_cleared');
  });
}

async function addHandoffDocument(handoffId, actorId, filePayload, metadata) {
  return withTransaction(async (client) => {
    const handoff = await getHandoffRow(handoffId, client);
    assertSenderActor(handoff, actorId);

    if (handoff.status !== 'file_upload_open') {
      throw createHandoffError('Document upload is not permitted at this stage. Files can only be uploaded after recipient clearance is approved.', 'HANDOFF_UPLOAD_BLOCKED', 403, {
        current_status: handoff.status,
        error_code: 'CLEARANCE_GATE_BLOCKED',
      });
    }

    const insertResult = await client.query(
      `
        INSERT INTO documents (
          case_id,
          handoff_id,
          filename,
          original_name,
          doc_type,
          source_status,
          sealed_flag,
          privilege_flag,
          confidentiality_flag,
          version_number,
          superseded_by,
          status,
          chunks_count,
          page_count,
          uploaded_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
      `,
      [
        handoff.case_id,
        handoff.id,
        filePayload.filename,
        filePayload.original_name,
        metadata.doc_type,
        metadata.source_status || 'original',
        Boolean(metadata.sealed_flag),
        Boolean(metadata.privilege_flag),
        Boolean(metadata.confidentiality_flag),
        Number(metadata.version_number || 1),
        metadata.superseded_by || null,
        filePayload.status || 'pending',
        filePayload.chunks_count || 0,
        metadata.page_count || null,
        actorId,
      ],
    );

    await logEvent('handoff', handoff.id, 'handoff_document_uploaded', actorId, handoff.status, handoff.status, {
      document_id: insertResult.rows[0].id,
      doc_type: metadata.doc_type,
    }, client);

    return insertResult.rows[0];
  });
}

async function getDocumentMap(handoffId, actorId, role = 'user', client = null) {
  const runner = getRunner(client);
  const handoff = await getHandoffRow(handoffId, client);
  assertReadable(handoff, actorId, role);

  if (role !== 'admin' && handoff.receiving_solicitor_id === actorId && !['pack_released', 'accepted', 'task_in_progress', 'post_action_pending', 'update_draft', 'update_verified', 'routed', 'completed', 'escalated'].includes(handoff.status)) {
    throw createHandoffError('Receiving solicitor may not access documents before pack release.', 'FORBIDDEN', 403);
  }

  const result = await runner.query(
    `
      SELECT *
      FROM documents
      WHERE handoff_id = $1
      ORDER BY uploaded_at DESC
    `,
    [handoffId],
  );

  return result.rows;
}

async function beginPackBuilding(handoffId, actorId) {
  return withTransaction(async (client) => {
    const handoff = await getHandoffRow(handoffId, client);
    assertSenderActor(handoff, actorId);
    const documentCount = await client.query(
      `
        SELECT COUNT(*)::int AS total
        FROM documents
        WHERE handoff_id = $1
          AND status = 'indexed'
      `,
      [handoffId],
    );

    if (documentCount.rows[0].total === 0) {
      throw createHandoffError('At least one indexed document is required before AI review.', 'NO_INDEXED_DOCUMENTS', 409);
    }

    if (handoff.status === 'pack_building') {
      return handoff;
    }

    return changeStatus(client, handoff, 'pack_building', actorId, 'handoff_pack_building_started');
  });
}

async function approveHandoverNote(handoffId, noteId, actorId, solicitorEdited) {
  return withTransaction(async (client) => {
    const handoff = await getHandoffRow(handoffId, client);
    assertSenderActor(handoff, actorId);
    const note = await getHandoverNoteById(handoffId, noteId, client);

    if (handoff.status !== 'pack_review' && handoff.status !== 'pack_building') {
      throw createHandoffError('Handover notes can only be approved while the pack is under review.', 'INVALID_TRANSITION', 409, {
        current_status: handoff.status,
        attempted_status: handoff.status,
        allowed_next: ['pack_review'],
      });
    }

    const updated = await client.query(
      `
        UPDATE handover_notes
        SET solicitor_edited = $2,
            approved_by = $3,
            approved_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [note.id, JSON.stringify(normaliseJson(solicitorEdited)), actorId],
    );

    let handoffResult = handoff;
    if (handoff.status === 'pack_building') {
      handoffResult = await changeStatus(client, handoff, 'pack_review', actorId, 'handover_note_approved', {
        note_id: note.id,
      });
    } else {
      await logEvent('handoff', handoff.id, 'handover_note_approved', actorId, handoff.status, handoff.status, { note_id: note.id }, client);
    }

    return { handoff: handoffResult, note: updated.rows[0] };
  });
}

async function releaseHandoverPack(handoffId, actorId) {
  return withTransaction(async (client) => {
    const handoff = await getHandoffRow(handoffId, client);
    assertSenderActor(handoff, actorId);
    const note = await getLatestHandoverNote(handoffId, client);

    if (!note || !note.approved_at) {
      throw createHandoffError('An approved handover note is required before release.', 'INVALID_TRANSITION', 409);
    }

    return changeStatus(client, handoff, 'pack_released', actorId, 'pack_released');
  });
}

async function acceptHandoff(handoffId, actorId, scope) {
  if (!TASK_SCOPES.has(scope)) {
    throw createHandoffError('Invalid task scope.', 'VALIDATION_ERROR', 422, {
      field_errors: { scope: 'Must be limited or continuing.' },
    });
  }

  return withTransaction(async (client) => {
    const handoff = await getHandoffRow(handoffId, client);
    assertReceiverActor(handoff, actorId);

    await client.query('UPDATE handoffs SET task_scope = $2, updated_at = NOW() WHERE id = $1', [handoffId, scope]);
    const accepted = await changeStatus(client, await getHandoffRow(handoffId, client), 'accepted', actorId, 'handoff_accepted', {
      task_scope: scope,
    });
    return changeStatus(client, accepted, 'task_in_progress', actorId, 'handoff_task_in_progress', {
      task_scope: scope,
    });
  });
}

async function updateTaskStatus(handoffId, actorId, details = {}) {
  return withTransaction(async (client) => {
    const handoff = await getHandoffRow(handoffId, client);
    assertReceiverActor(handoff, actorId);

    if (handoff.status === 'accepted') {
      return changeStatus(client, handoff, 'task_in_progress', actorId, 'handoff_task_in_progress', details);
    }

    if (handoff.status !== 'task_in_progress') {
      throw createHandoffError('Task progress may only be updated while the handoff is in progress.', 'INVALID_TRANSITION', 409, {
        current_status: handoff.status,
        attempted_status: 'task_in_progress',
        allowed_next: ['task_in_progress'],
      });
    }

    await logEvent('handoff', handoff.id, 'handoff_task_event_recorded', actorId, handoff.status, handoff.status, details, client);
    return handoff;
  });
}

async function addHearingNote(handoffId, actorId, payload = {}) {
  return withTransaction(async (client) => {
    const handoff = await getHandoffRow(handoffId, client);
    assertReceiverActor(handoff, actorId);

    if (payload.hearing_note_type === 'live_court_recording') {
      throw createHandoffError('Live in-court audio recording is not permitted under Courts Act 2003 s.85B. Use post-hearing dictation or official transcript import only.', 'RECORDING_PROHIBITED', 403);
    }

    if (handoff.status !== 'task_in_progress') {
      throw createHandoffError('Hearing notes may only be added while the task is in progress.', 'INVALID_TRANSITION', 409, {
        current_status: handoff.status,
        attempted_status: 'task_in_progress',
        allowed_next: ['task_in_progress'],
      });
    }

    let document = null;
    if (payload.filePayload) {
      const docType = HEARING_NOTE_TYPES[payload.hearing_note_type] || 'attendance_note';
      const insert = await client.query(
        `
          INSERT INTO documents (
            case_id, handoff_id, filename, original_name, doc_type,
            source_status, sealed_flag, privilege_flag, confidentiality_flag,
            version_number, superseded_by, status, chunks_count, page_count, uploaded_by
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
          RETURNING *
        `,
        [
          handoff.case_id,
          handoff.id,
          payload.filePayload.filename,
          payload.filePayload.original_name,
          docType,
          payload.source_status || 'original',
          false,
          false,
          false,
          1,
          null,
          payload.filePayload.status || 'pending',
          0,
          payload.page_count || null,
          actorId,
        ],
      );
      document = insert.rows[0];
    }

    await client.query(
      `
        UPDATE handoffs
        SET recording_risk_acknowledged = TRUE,
            hearing_note_type = $2,
            updated_at = NOW()
        WHERE id = $1
      `,
      [handoffId, payload.hearing_note_type || 'typed_attendance_note'],
    );

    await logEvent('handoff', handoff.id, 'handoff_hearing_note_captured', actorId, handoff.status, handoff.status, {
      hearing_note_type: payload.hearing_note_type || 'typed_attendance_note',
      note_text: payload.note_text || null,
      document_id: document?.id || null,
    }, client);

    return { handoff: await getHandoffRow(handoffId, client), document, note_text: payload.note_text || null };
  });
}

async function createPostActionRecord(handoffId, actorId, payload = {}) {
  return withTransaction(async (client) => {
    const handoff = await getHandoffRow(handoffId, client);
    assertReceiverActor(handoff, actorId);

    if (handoff.status !== 'task_in_progress') {
      throw createHandoffError('Post-action updates may only be created while the handoff is in progress.', 'INVALID_TRANSITION', 409, {
        current_status: handoff.status,
        attempted_status: 'post_action_pending',
        allowed_next: ['post_action_pending'],
      });
    }

    let document = null;
    if (payload.filePayload) {
      const insert = await client.query(
        `
          INSERT INTO documents (
            case_id, handoff_id, filename, original_name, doc_type,
            source_status, sealed_flag, privilege_flag, confidentiality_flag,
            version_number, superseded_by, status, chunks_count, page_count, uploaded_by
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
          RETURNING *
        `,
        [
          handoff.case_id,
          handoff.id,
          payload.filePayload.filename,
          payload.filePayload.original_name,
          payload.doc_type || 'post_action_doc',
          payload.source_status || 'original',
          Boolean(payload.sealed_flag),
          Boolean(payload.privilege_flag),
          Boolean(payload.confidentiality_flag),
          Number(payload.version_number || 1),
          payload.superseded_by || null,
          payload.filePayload.status || 'pending',
          payload.filePayload.chunks_count || 0,
          payload.page_count || null,
          actorId,
        ],
      );
      document = insert.rows[0];
    }

    const created = await client.query(
      `
        INSERT INTO post_action_updates (
          handoff_id,
          what_was_done,
          what_happened,
          what_follows,
          new_procedural_status
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `,
      [handoffId, payload.what_was_done, payload.what_happened, payload.what_follows, payload.new_procedural_status || null],
    );

    const pending = await changeStatus(client, handoff, 'post_action_pending', actorId, 'handoff_post_action_recorded', {
      post_action_update_id: created.rows[0].id,
      document_id: document?.id || null,
    });

    return {
      handoff: pending,
      post_action_update: created.rows[0],
      document,
    };
  });
}

async function markUpdateDraftReady(handoffId, actorId, updateId) {
  return withTransaction(async (client) => {
    const handoff = await getHandoffRow(handoffId, client);
    assertReceiverActor(handoff, actorId);
    const update = await getPostActionUpdateById(updateId, handoffId, client);

    if (handoff.status === 'post_action_pending') {
      const updated = await changeStatus(client, handoff, 'update_draft', actorId, 'handoff_update_draft_started', {
        post_action_update_id: update.id,
      });
      return { handoff: updated, post_action_update: update };
    }

    if (handoff.status === 'update_draft') {
      return { handoff, post_action_update: update };
    }

    throw createHandoffError('Update drafts may only be generated after post-action capture.', 'INVALID_TRANSITION', 409, {
      current_status: handoff.status,
      attempted_status: 'update_draft',
      allowed_next: ['update_draft'],
    });
  });
}

async function verifyUpdate(handoffId, updateId, actorId, payload) {
  return withTransaction(async (client) => {
    const handoff = await getHandoffRow(handoffId, client);
    assertReceiverActor(handoff, actorId);
    const update = await getPostActionUpdateById(updateId, handoffId, client);

    if (handoff.status !== 'update_draft') {
      throw createHandoffError('Only update drafts can be verified.', 'INVALID_TRANSITION', 409, {
        current_status: handoff.status,
        attempted_status: 'update_verified',
        allowed_next: ['update_verified'],
      });
    }

    const verifiedResult = await client.query(
      `
        UPDATE post_action_updates
        SET verified_version = $2,
            new_procedural_status = $3,
            verified_by = $4,
            verified_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [update.id, JSON.stringify(normaliseJson(payload.verified_version)), payload.new_procedural_status || null, actorId],
    );

    const updatedHandoff = await changeStatus(client, handoff, 'update_verified', actorId, 'update_verified', {
      post_action_update_id: update.id,
    });

    await client.query(
      `
        UPDATE cases
        SET most_recent_operative_event = $2,
            updated_at = NOW()
        WHERE id = $1
      `,
      [handoff.case_id, payload.new_procedural_status || update.what_happened],
    );

    return {
      handoff: updatedHandoff,
      post_action_update: verifiedResult.rows[0],
    };
  });
}

async function routeHandoff(handoffId, outcome, actorId) {
  if (!ROUTING_OUTCOMES.has(outcome)) {
    throw createHandoffError('Invalid routing outcome.', 'VALIDATION_ERROR', 422, {
      field_errors: { routing_outcome: 'Invalid routing outcome.' },
    });
  }

  return withTransaction(async (client) => {
    const handoff = await getHandoffRow(handoffId, client);
    assertReceiverActor(handoff, actorId);

    if (handoff.status !== 'update_verified') {
      throw createHandoffError('A handoff can only be routed after the update is verified.', 'INVALID_TRANSITION', 409, {
        current_status: handoff.status,
        attempted_status: 'routed',
        allowed_next: ['routed'],
      });
    }

    await client.query('UPDATE handoffs SET routing_outcome = $2, updated_at = NOW() WHERE id = $1', [handoffId, outcome]);
    const routed = await changeStatus(client, await getHandoffRow(handoffId, client), 'routed', actorId, 'handoff_routed', {
      routing_outcome: outcome,
    });

    let n434Reminder = null;
    if (outcome === 'new_instructed_solicitor') {
      await client.query(
        `
          UPDATE cases
          SET solicitor_on_record_id = $2,
              updated_at = NOW()
          WHERE id = $1
        `,
        [handoff.case_id, handoff.receiving_solicitor_id],
      );

      if (handoff.n434_triggered) {
        n434Reminder = 'N434 Notice of Change must be filed and served under CPR Part 42. CasePass does not file this automatically.';
      }
    }

    const terminalStatus = toTerminalStatus(outcome);
    const finalHandoff = await changeStatus(client, routed, terminalStatus, actorId, 'handoff_routed_terminal', {
      routing_outcome: outcome,
    });

    const snapshot = await snapshotMatterStatus(handoff.case_id, handoffId, actorId, client);
    await logEvent('handoff', handoffId, 'matter_status_snapshot_created', actorId, null, null, {
      matter_status_snapshot_id: snapshot.id,
    }, client);

    return {
      ...finalHandoff,
      n434_reminder: n434Reminder,
    };
  });
}

async function getFullHandoffState(handoffId, actorId, role = 'user') {
  const handoff = await getHandoffRow(handoffId);
  assertReadable(handoff, actorId, role);
  const caseResult = await query('SELECT * FROM cases WHERE id = $1', [handoff.case_id]);
  const notesResult = await query('SELECT * FROM handover_notes WHERE handoff_id = $1 ORDER BY version_number ASC, created_at ASC', [handoffId]);
  const updatesResult = await query('SELECT * FROM post_action_updates WHERE handoff_id = $1 ORDER BY created_at ASC', [handoffId]);
  const documents = await getDocumentMap(handoffId, actorId, role).catch((error) => {
    if (error.statusCode === 403) {
      return [];
    }
    throw error;
  });

  return {
    ...handoff,
    case_summary: caseResult.rows[0] || null,
    handover_notes: notesResult.rows.map((row) => ({
      ...row,
      ai_draft: normaliseJson(row.ai_draft),
      solicitor_edited: normaliseJson(row.solicitor_edited),
    })),
    post_action_updates: updatesResult.rows.map((row) => ({
      ...row,
      ai_draft: normaliseJson(row.ai_draft),
      verified_version: normaliseJson(row.verified_version),
    })),
    documents,
  };
}

async function listCaseHandoffs(caseId, actorId, role = 'user') {
  const caseRow = await getCaseRow(caseId);
  if (role !== 'admin' && caseRow.created_by !== actorId && caseRow.solicitor_on_record_id !== actorId) {
    const accessResult = await query(
      `
        SELECT 1
        FROM handoffs
        WHERE case_id = $1
          AND receiving_solicitor_id = $2
        LIMIT 1
      `,
      [caseId, actorId],
    );
    if (!accessResult.rows[0]) {
      throw createHandoffError('You do not have access to this case.', 'FORBIDDEN', 403);
    }
  }

  const result = await query(
    `
      SELECT
        h.*,
        sender.name AS sending_solicitor_name,
        receiver.name AS receiving_solicitor_name
      FROM handoffs h
      INNER JOIN users sender ON sender.id = h.sending_solicitor_id
      LEFT JOIN users receiver ON receiver.id = h.receiving_solicitor_id
      WHERE h.case_id = $1
      ORDER BY h.created_at DESC
    `,
    [caseId],
  );

  return result.rows;
}

async function getContinuity(handoffId, actorId, role = 'user') {
  const handoff = await getHandoffRow(handoffId);
  assertReadable(handoff, actorId, role);
  const [auditTrail, caseTimeline, matterSnapshots, sourceRegister] = await Promise.all([
    getHandoffAuditTrail(handoffId),
    getCaseTimeline(handoff.case_id),
    getStatusHistory(handoff.case_id),
    getDocumentMap(handoffId, actorId, role).catch(() => []),
  ]);

  return {
    handoff: await getFullHandoffState(handoffId, actorId, role),
    audit_trail: auditTrail,
    case_timeline: caseTimeline,
    matter_snapshots: matterSnapshots,
    source_register: sourceRegister,
  };
}

async function listHandoverNotes(handoffId, actorId, role = 'user') {
  const handoff = await getHandoffRow(handoffId);
  assertReadable(handoff, actorId, role);
  const result = await query('SELECT * FROM handover_notes WHERE handoff_id = $1 ORDER BY version_number ASC, created_at ASC', [handoffId]);
  return result.rows;
}

async function listPostActionUpdates(handoffId, actorId, role = 'user') {
  const handoff = await getHandoffRow(handoffId);
  assertReadable(handoff, actorId, role);
  const result = await query('SELECT * FROM post_action_updates WHERE handoff_id = $1 ORDER BY created_at ASC', [handoffId]);
  return result.rows;
}

module.exports = {
  createHandoff,
  submitClearance,
  setRepresentationType,
  releaseHandoverPack,
  acceptHandoff,
  routeHandoff,
  setComplianceHold,
  clearComplianceHold,
  addHandoffDocument,
  getDocumentMap,
  beginPackBuilding,
  approveHandoverNote,
  updateTaskStatus,
  addHearingNote,
  createPostActionRecord,
  markUpdateDraftReady,
  verifyUpdate,
  getFullHandoffState,
  listCaseHandoffs,
  getContinuity,
  listHandoverNotes,
  listPostActionUpdates,
  getLatestHandoverNote,
  getHandoverNoteById,
  getPostActionUpdateById,
  getHandoffRow,
  getCaseRow,
  TERMINAL_STATUSES,
};
