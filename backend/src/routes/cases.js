const express = require('express');
const { query } = require('../db');
const { logEvent } = require('../services/auditService');

const router = express.Router();

const FORUMS = new Set([
  'county_court',
  'high_court_kbd',
  'high_court_chancery',
  'high_court_family',
  'court_of_appeal_civil',
  'employment_tribunal',
  'upper_tribunal',
  'magistrates_court',
  'other_tribunal',
]);
const TRACKS = new Set(['small_claims', 'fast_track', 'intermediate_track', 'multi_track', 'unallocated']);
const URGENCY = new Set(['routine', 'elevated', 'urgent', 'critical']);

function createCaseError(message, statusCode = 400, fieldErrors = null) {
  return Object.assign(new Error(message), {
    statusCode,
    field_errors: fieldErrors,
  });
}

function validateCasePayload(payload, { partial = false } = {}) {
  const errors = {};
  const requiredFields = ['case_title', 'claimant', 'defendant', 'forum', 'urgency'];

  for (const field of requiredFields) {
    if (!partial && (payload[field] === undefined || payload[field] === null || payload[field] === '')) {
      errors[field] = 'This field is required.';
    }
  }

  if (payload.forum !== undefined && payload.forum !== null && !FORUMS.has(payload.forum)) {
    errors.forum = 'Invalid forum value.';
  }

  if (payload.track !== undefined && payload.track !== null && payload.track !== '' && !TRACKS.has(payload.track)) {
    errors.track = 'Invalid track value.';
  }

  if (payload.urgency !== undefined && payload.urgency !== null && !URGENCY.has(payload.urgency)) {
    errors.urgency = 'Invalid urgency value.';
  }

  if (Object.keys(errors).length > 0) {
    throw createCaseError('Validation failed.', 422, errors);
  }
}

async function getAccessibleCase(caseId, userId, role) {
  const result = await query(
    `
      SELECT c.*
      FROM cases c
      WHERE c.id = $1
        AND (
          $3 = 'admin'
          OR c.created_by = $2
          OR c.solicitor_on_record_id = $2
          OR EXISTS (
            SELECT 1
            FROM handoffs h
            WHERE h.case_id = c.id
              AND h.receiving_solicitor_id = $2
              AND h.status NOT IN ('clearance_failed', 'completed', 'escalated')
          )
        )
    `,
    [caseId, userId, role],
  );

  return result.rows[0] || null;
}

function buildCaseParams(body, userId) {
  return [
    body.case_title,
    body.claim_number || null,
    body.claimant,
    body.defendant,
    body.appellant || null,
    body.forum,
    body.court_name || null,
    body.division_or_list || null,
    body.ruleset || null,
    body.tribunal_chamber || null,
    body.claim_type || null,
    body.part7_or_part8 || null,
    body.appeal_flag === undefined ? false : Boolean(body.appeal_flag),
    body.pre_action_protocol || null,
    body.track || null,
    body.complexity_band || null,
    body.cmc_flag === undefined ? false : Boolean(body.cmc_flag),
    body.ptr_flag === undefined ? false : Boolean(body.ptr_flag),
    body.issue_date || null,
    body.service_method || null,
    body.aos_due || null,
    body.defence_due || null,
    body.next_hearing_type || null,
    body.next_hearing_date || null,
    body.hearing_mode || null,
    body.bundle_due || null,
    body.skeleton_due || null,
    body.disclosure_regime || null,
    body.pd57ad_flag === undefined ? false : Boolean(body.pd57ad_flag),
    body.n265_status || null,
    body.witness_statements_status || null,
    body.pd57ac_flag === undefined ? false : Boolean(body.pd57ac_flag),
    body.expert_permission === undefined ? false : Boolean(body.expert_permission),
    body.costs_regime || null,
    body.frc_flag === undefined ? false : Boolean(body.frc_flag),
    body.qocs_flag === undefined ? false : Boolean(body.qocs_flag),
    body.part36_offer_flag === undefined ? false : Boolean(body.part36_offer_flag),
    userId,
    body.n434_status || 'not_required',
    body.human_verified === undefined ? false : Boolean(body.human_verified),
    body.last_verified_by || null,
    body.last_verified_at || null,
    body.forum_uncertain === undefined ? false : Boolean(body.forum_uncertain),
    body.bundle_noncompliance_risk === undefined ? false : Boolean(body.bundle_noncompliance_risk),
    body.recording_risk_flag === undefined ? false : Boolean(body.recording_risk_flag),
    body.solicitor_notes || null,
    body.strategic_notes || null,
    body.most_recent_operative_event || null,
    body.next_procedural_step || null,
    body.urgency,
    userId,
  ];
}

router.post('/', async (req, res) => {
  try {
    validateCasePayload(req.body);
    const params = buildCaseParams(req.body, req.user.id);
    const result = await query(
      `
        INSERT INTO cases (
          case_title, claim_number, claimant, defendant, appellant,
          forum, court_name, division_or_list, ruleset, tribunal_chamber,
          claim_type, part7_or_part8, appeal_flag, pre_action_protocol,
          track, complexity_band, cmc_flag, ptr_flag,
          issue_date, service_method, aos_due, defence_due,
          next_hearing_type, next_hearing_date, hearing_mode, bundle_due, skeleton_due,
          disclosure_regime, pd57ad_flag, n265_status,
          witness_statements_status, pd57ac_flag, expert_permission,
          costs_regime, frc_flag, qocs_flag, part36_offer_flag,
          solicitor_on_record_id, n434_status,
          human_verified, last_verified_by, last_verified_at,
          forum_uncertain, bundle_noncompliance_risk, recording_risk_flag,
          solicitor_notes, strategic_notes, most_recent_operative_event, next_procedural_step,
          urgency, created_by
        )
        VALUES (
          $1,$2,$3,$4,$5,
          $6,$7,$8,$9,$10,
          $11,$12,$13,$14,
          $15,$16,$17,$18,
          $19,$20,$21,$22,
          $23,$24,$25,$26,$27,
          $28,$29,$30,
          $31,$32,$33,
          $34,$35,$36,$37,
          $38,$39,
          $40,$41,$42,
          $43,$44,$45,
          $46,$47,$48,$49,
          $50,$51
        )
        RETURNING *
      `,
      params,
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    return res.status(error.statusCode || 500).json(error.field_errors ? { error: error.message, field_errors: error.field_errors } : { error: error.message || 'Unable to create case.' });
  }
});

router.get('/', async (req, res) => {
  try {
    const params = [req.user.id, req.user.role];
    const filters = [
      `(
        $2 = 'admin'
        OR c.created_by = $1
        OR c.solicitor_on_record_id = $1
        OR EXISTS (
          SELECT 1
          FROM handoffs h_access
          WHERE h_access.case_id = c.id
            AND h_access.receiving_solicitor_id = $1
            AND h_access.status NOT IN ('clearance_failed', 'completed', 'escalated')
        )
      )`,
    ];

    if (req.query.forum) {
      params.push(req.query.forum);
      filters.push(`c.forum = $${params.length}`);
    }
    if (req.query.track) {
      params.push(req.query.track);
      filters.push(`c.track = $${params.length}`);
    }
    if (req.query.urgency) {
      params.push(req.query.urgency);
      filters.push(`c.urgency = $${params.length}`);
    }
    if (req.query.search) {
      params.push(`%${req.query.search}%`);
      const idx = params.length;
      filters.push(`(c.case_title ILIKE $${idx} OR c.claim_number ILIKE $${idx} OR c.claimant ILIKE $${idx} OR c.defendant ILIKE $${idx})`);
    }

    const result = await query(
      `
        SELECT
          c.*,
          (
            SELECT h.status
            FROM handoffs h
            WHERE h.case_id = c.id
            ORDER BY h.created_at DESC
            LIMIT 1
          ) AS active_handoff_status,
          (SELECT COUNT(*)::int FROM documents d WHERE d.case_id = c.id) AS document_count,
          COALESCE((SELECT SUM(COALESCE(d.page_count, 0))::int FROM documents d WHERE d.case_id = c.id), 0) AS pages_indexed,
          (SELECT COUNT(*)::int FROM alerts a WHERE a.case_id = c.id AND a.resolved = FALSE) AS alert_count,
          (SELECT COUNT(*)::int FROM checklist_items ci WHERE ci.case_id = c.id) AS checklist_total,
          (SELECT COUNT(*)::int FROM checklist_items ci WHERE ci.case_id = c.id AND ci.completed = TRUE) AS checklist_completed
        FROM cases c
        WHERE ${filters.join(' AND ')}
        ORDER BY c.updated_at DESC, c.created_at DESC
      `,
      params,
    );

    return res.json(result.rows);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to fetch cases.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const caseRow = await getAccessibleCase(req.params.id, req.user.id, req.user.role);
    if (!caseRow) {
      const exists = await query('SELECT 1 FROM cases WHERE id = $1', [req.params.id]);
      return res.status(exists.rows[0] ? 403 : 404).json({ error: exists.rows[0] ? 'You do not have access to this case.' : 'Case not found.' });
    }

    const [handoffResult, documentsResult, alertsResult, checklistResult, updatesResult] = await Promise.all([
      query('SELECT * FROM handoffs WHERE case_id = $1 ORDER BY created_at DESC LIMIT 1', [req.params.id]),
      query('SELECT * FROM documents WHERE case_id = $1 ORDER BY uploaded_at DESC', [req.params.id]),
      query('SELECT * FROM alerts WHERE case_id = $1 ORDER BY created_at DESC', [req.params.id]),
      query('SELECT * FROM checklist_items WHERE case_id = $1 ORDER BY created_at ASC', [req.params.id]),
      query('SELECT * FROM case_updates WHERE case_id = $1 ORDER BY created_at DESC', [req.params.id]),
    ]);

    return res.json({
      ...caseRow,
      active_handoff_summary: handoffResult.rows[0] || null,
      documents: documentsResult.rows,
      alerts: alertsResult.rows,
      checklist_items: checklistResult.rows,
      case_updates: updatesResult.rows,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to fetch case.' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    validateCasePayload(req.body, { partial: true });
    const caseRow = await getAccessibleCase(req.params.id, req.user.id, req.user.role);
    if (!caseRow) {
      const exists = await query('SELECT 1 FROM cases WHERE id = $1', [req.params.id]);
      return res.status(exists.rows[0] ? 403 : 404).json({ error: exists.rows[0] ? 'You do not have access to this case.' : 'Case not found.' });
    }

    if (caseRow.created_by !== req.user.id && caseRow.solicitor_on_record_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the case creator or solicitor on record may update this case.' });
    }

    const merged = { ...caseRow, ...req.body };
    const params = buildCaseParams(merged, caseRow.solicitor_on_record_id || req.user.id).slice(0, 50);
    params.push(req.params.id);
    const result = await query(
      `
        UPDATE cases
        SET case_title = $1,
            claim_number = $2,
            claimant = $3,
            defendant = $4,
            appellant = $5,
            forum = $6,
            court_name = $7,
            division_or_list = $8,
            ruleset = $9,
            tribunal_chamber = $10,
            claim_type = $11,
            part7_or_part8 = $12,
            appeal_flag = $13,
            pre_action_protocol = $14,
            track = $15,
            complexity_band = $16,
            cmc_flag = $17,
            ptr_flag = $18,
            issue_date = $19,
            service_method = $20,
            aos_due = $21,
            defence_due = $22,
            next_hearing_type = $23,
            next_hearing_date = $24,
            hearing_mode = $25,
            bundle_due = $26,
            skeleton_due = $27,
            disclosure_regime = $28,
            pd57ad_flag = $29,
            n265_status = $30,
            witness_statements_status = $31,
            pd57ac_flag = $32,
            expert_permission = $33,
            costs_regime = $34,
            frc_flag = $35,
            qocs_flag = $36,
            part36_offer_flag = $37,
            solicitor_on_record_id = $38,
            n434_status = $39,
            human_verified = $40,
            last_verified_by = $41,
            last_verified_at = $42,
            forum_uncertain = $43,
            bundle_noncompliance_risk = $44,
            recording_risk_flag = $45,
            solicitor_notes = $46,
            strategic_notes = $47,
            most_recent_operative_event = $48,
            next_procedural_step = $49,
            urgency = $50,
            updated_at = NOW()
        WHERE id = $51
        RETURNING *
      `,
      params,
    );

    await logEvent('case', req.params.id, 'case_updated', req.user.id, null, null, { changed_fields: Object.keys(req.body) });
    return res.json(result.rows[0]);
  } catch (error) {
    return res.status(error.statusCode || 500).json(error.field_errors ? { error: error.message, field_errors: error.field_errors } : { error: error.message || 'Unable to update case.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const caseRow = await query('SELECT * FROM cases WHERE id = $1', [req.params.id]);
    if (!caseRow.rows[0]) {
      return res.status(404).json({ error: 'Case not found.' });
    }

    const accessResult = await query(
      `
        SELECT 1
        FROM handoffs
        WHERE case_id = $1
          AND receiving_solicitor_id = $2
        LIMIT 1
      `,
      [req.params.id, req.user.id],
    );

    const canDelete = req.user.role === 'admin'
      || caseRow.rows[0].created_by === req.user.id
      || caseRow.rows[0].solicitor_on_record_id === req.user.id
      || Boolean(accessResult.rows[0]);

    if (!canDelete) {
      return res.status(403).json({ error: 'You do not have access to delete this case.' });
    }

    await logEvent('case', req.params.id, 'case_deleted', req.user.id, null, null, {
      case_title: caseRow.rows[0].case_title,
    });
    await query('DELETE FROM cases WHERE id = $1', [req.params.id]);
    return res.json({ success: true, id: req.params.id });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to delete case.' });
  }
});

module.exports = router;
