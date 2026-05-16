const { query } = require('../db');
const { searchChunks, getIndexedChunksForHandoff } = require('./ragService');
const claudeService = require('./claudeService');
const { logEvent } = require('./auditService');

function createAiError(message, code, statusCode = 400, extra = {}) {
  return Object.assign(new Error(message), { code, statusCode, ...extra });
}

function requireCitation(text, fieldName, options = {}) {
  const value = String(text || '').trim();
  if (!value) {
    return;
  }

  if (options.allowNotFound && value === 'Not found in file.') {
    return;
  }

  if (options.allowStrategic && value.startsWith('Strategic note:')) {
    return;
  }

  if (!/\[Doc:\s*[^\]]+,\s*p\.\d+\]/.test(value)) {
    throw createAiError(`AI output field ${fieldName} is missing a source citation.`, 'AI_OUTPUT_UNGROUNDED', 422);
  }
}

function requireCitationArray(items, fieldName, options = {}) {
  for (const item of items || []) {
    requireCitation(item, fieldName, options);
  }
}

async function getHandoffContext(handoffId) {
  const result = await query(
    `
      SELECT
        h.*, c.case_title, c.claim_number, c.claimant, c.defendant,
        c.claim_type AS matter_type,
        c.forum, c.ruleset, c.court_name,
        c.most_recent_operative_event,
        c.next_procedural_step
      FROM handoffs h
      INNER JOIN cases c ON c.id = h.case_id
      WHERE h.id = $1
    `,
    [handoffId],
  );

  if (!result.rows[0]) {
    throw createAiError('Handoff not found for AI workflow.', 'HANDOFF_NOT_FOUND', 404);
  }

  const row = result.rows[0];
  return {
    ...row,
    parties: `${row.client_name} v ${row.opponent_name}`,
    court: row.court_name || row.forum,
    next_hearing_date: row.next_hearing_date,
    case_name: row.case_title,
    last_known_action: row.most_recent_operative_event,
  };
}

async function findRelevantChunks(handoffId, queries) {
  for (const candidate of queries) {
    if (!candidate) {
      continue;
    }

    const chunks = await searchChunks(candidate, handoffId, 5);
    if (chunks.length > 0) {
      return chunks;
    }
  }

  if (!process.env.OPENAI_API_KEY) {
    return getIndexedChunksForHandoff(handoffId, 5);
  }

  return [];
}

async function getPostActionContext(postActionId) {
  const result = await query(
    `
      SELECT
        pau.*, h.case_id, h.id AS handoff_id,
        c.claimant, c.defendant, h.rights_of_audience_forum, h.handoff_type,
        c.case_title, c.next_hearing_date,
        ARRAY(
          SELECT d.original_name
          FROM documents d
          WHERE d.handoff_id = h.id
            AND d.doc_type = 'post_action_doc'
          ORDER BY d.uploaded_at DESC
        ) AS new_doc_names
      FROM post_action_updates pau
      INNER JOIN handoffs h ON h.id = pau.handoff_id
      INNER JOIN cases c ON c.id = h.case_id
      WHERE pau.id = $1
    `,
    [postActionId],
  );

  if (!result.rows[0]) {
    throw createAiError('Post-action update not found for AI draft generation.', 'POST_ACTION_NOT_FOUND', 404);
  }

  return result.rows[0];
}

function validateMatterReview(review) {
  if (review.error) {
    throw createAiError(review.error, 'AI_REVIEW_INVALID_JSON', 502, { raw: review.raw });
  }

  requireCitation(review.stage_of_proceedings, 'stage_of_proceedings', { allowNotFound: true });
  requireCitation(review.most_recent_operative_event, 'most_recent_operative_event', { allowNotFound: true });
  requireCitation(review.next_procedural_step, 'next_procedural_step', { allowNotFound: true });
  requireCitationArray(review.live_deadlines, 'live_deadlines', { allowNotFound: true });
  requireCitationArray(review.urgent_issues, 'urgent_issues', { allowNotFound: true });

  if (!Array.isArray(review.sources) || review.sources.length === 0) {
    throw createAiError('AI matter review did not provide grounded sources.', 'AI_OUTPUT_UNGROUNDED', 422);
  }
}

function validateHandoverNote(note) {
  requireCitation(note.executive_summary, 'executive_summary');
  requireCitation(note.current_procedural_status, 'current_procedural_status');
  requireCitation(note.next_required_step, 'next_required_step');
  requireCitationArray(note.live_deadlines, 'live_deadlines');
  requireCitationArray(note.file_based_facts, 'file_based_facts');
  requireCitationArray(note.risk_flags, 'risk_flags', { allowStrategic: true });

  if (!Array.isArray(note.sources) || note.sources.length === 0) {
    throw createAiError('AI handover note did not provide grounded sources.', 'AI_OUTPUT_UNGROUNDED', 422);
  }
}

function validateUpdateDraft(updateDraft) {
  requireCitation(updateDraft.what_was_done, 'what_was_done');
  requireCitation(updateDraft.outcome, 'outcome');
  requireCitation(updateDraft.new_procedural_status, 'new_procedural_status');
  requireCitation(updateDraft.what_follows, 'what_follows');
  requireCitationArray(updateDraft.updated_deadlines, 'updated_deadlines');

  if (!Array.isArray(updateDraft.sources) || updateDraft.sources.length === 0) {
    throw createAiError('AI update draft did not provide grounded sources.', 'AI_OUTPUT_UNGROUNDED', 422);
  }
}

async function reviewMatter(handoffId, actorId = null) {
  const handoff = await getHandoffContext(handoffId);
  const chunks = await findRelevantChunks(handoffId, [
    'stage proceedings operative event live deadlines urgent issues next procedural step',
    handoff.last_known_action,
    handoff.intended_task,
    `${handoff.case_name} ${handoff.matter_type} ${handoff.court}`,
  ]);
  const review = await claudeService.reviewMatter(handoffId, chunks, {
    case_name: handoff.case_name,
    matter_type: handoff.matter_type,
    court: handoff.court,
    parties: handoff.parties,
    last_known_action: handoff.last_known_action,
    next_hearing_date: handoff.next_hearing_date,
  });

  validateMatterReview(review);
  await logEvent('handoff', handoffId, 'handoff.ai_review_generated', actorId || handoff.sending_solicitor_id, handoff.status, handoff.status, { step: 7 });
  return review;
}

async function generateHandoverNote(handoffId, actorId = null) {
  const handoff = await getHandoffContext(handoffId);
  const matterReview = await reviewMatter(handoffId, actorId);
  const chunks = await findRelevantChunks(handoffId, [
    `${handoff.intended_task} ${handoff.case_name}`,
    matterReview.most_recent_operative_event,
    matterReview.next_procedural_step,
    ...(matterReview.live_deadlines || []),
  ]);
  const note = await claudeService.generateHandoverNote(handoffId, chunks, {
    case_name: handoff.case_name,
    matter_type: handoff.matter_type,
    court: handoff.court,
    parties: handoff.parties,
    intended_task: handoff.intended_task,
  }, matterReview);

  validateHandoverNote(note);

  const versionResult = await query(
    'SELECT COALESCE(MAX(version_number), 0) + 1 AS next_version FROM handover_notes WHERE handoff_id = $1',
    [handoffId],
  );
  const versionNumber = Number(versionResult.rows[0].next_version || 1);

  const insertResult = await query(
    `
      INSERT INTO handover_notes (
        handoff_id,
        ai_draft,
        ai_generated_at,
        ai_token_count,
        version_number
      )
      VALUES ($1, $2, NOW(), $3, $4)
      RETURNING *
    `,
    [handoffId, JSON.stringify(note), JSON.stringify(note).length, versionNumber],
  );

  await logEvent('handoff', handoffId, 'handoff.ai_handover_note_generated', actorId || handoff.sending_solicitor_id, handoff.status, handoff.status, {
    step: 8,
    handover_note_id: insertResult.rows[0].id,
    version_number: versionNumber,
  });

  return {
    note_id: insertResult.rows[0].id,
    version_number: versionNumber,
    ...note,
  };
}

async function generateUpdateDraft(postActionId, actorId = null) {
  const postAction = await getPostActionContext(postActionId);
  const chunks = await findRelevantChunks(postAction.handoff_id, [
    `${postAction.what_was_done} ${postAction.what_happened} ${postAction.what_follows}`,
    postAction.new_procedural_status,
    ...(postAction.new_doc_names || []),
  ]);
  const draft = await claudeService.generateUpdateDraft(postAction.handoff_id, chunks, {
    what_was_done: postAction.what_was_done,
    what_happened: postAction.what_happened,
    what_follows: postAction.what_follows,
    new_doc_names: postAction.new_doc_names || [],
    hearing_date: postAction.next_hearing_date || postAction.next_date,
  });

  validateUpdateDraft(draft);

  const updateResult = await query(
    `
      UPDATE post_action_updates
      SET ai_draft = $2,
          ai_generated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [postActionId, JSON.stringify(draft)],
  );

  await logEvent('handoff', postAction.handoff_id, 'handoff.ai_update_draft_generated', actorId || null, null, null, {
    step: 15,
    post_action_update_id: postActionId,
  });

  return {
    post_action_id: updateResult.rows[0].id,
    ...draft,
  };
}

module.exports = {
  reviewMatter,
  generateHandoverNote,
  generateUpdateDraft,
};
