const express = require('express');
const { query } = require('../db');

const publicSharedRouter = express.Router();
const privateShareRouter = express.Router();

privateShareRouter.post('/cases/:id/share', async (req, res) => {
  try {
    const caseResult = await query('SELECT * FROM cases WHERE id = $1', [req.params.id]);
    const caseRow = caseResult.rows[0];

    if (!caseRow) {
      return res.status(404).json({ error: 'Case not found.' });
    }

    if (req.user.role !== 'admin' && caseRow.created_by !== req.user.id && caseRow.solicitor_on_record_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the case creator or solicitor on record may share this case.' });
    }

    const existing = await query('SELECT * FROM shared_links WHERE case_id = $1 LIMIT 1', [req.params.id]);
    let sharedLink;

    if (existing.rows[0]) {
      const updated = await query(
        `
          UPDATE shared_links
          SET expires_at = $2
          WHERE case_id = $1
          RETURNING *
        `,
        [req.params.id, req.body.expires_at || existing.rows[0].expires_at || null],
      );
      sharedLink = updated.rows[0];
    } else {
      const inserted = await query(
        `
          INSERT INTO shared_links (case_id, created_by, expires_at)
          VALUES ($1, $2, $3)
          RETURNING *
        `,
        [req.params.id, req.user.id, req.body.expires_at || null],
      );
      sharedLink = inserted.rows[0];
    }

    const appUrl = process.env.APP_URL || 'https://casepass.app';
    return res.json({ token: sharedLink.token, url: `${appUrl}/shared/${sharedLink.token}` });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to create share link.' });
  }
});

publicSharedRouter.get('/shared/:token', async (req, res) => {
  try {
    const sharedResult = await query(
      `
        SELECT *
        FROM shared_links
        WHERE token = $1
      `,
      [req.params.token],
    );
    const sharedLink = sharedResult.rows[0];

    if (!sharedLink) {
      return res.status(404).json({ error: 'Shared link not found.' });
    }

    if (sharedLink.expires_at && new Date(sharedLink.expires_at) < new Date()) {
      return res.status(403).json({ error: 'Shared link has expired.' });
    }

    const caseResult = await query('SELECT * FROM cases WHERE id = $1', [sharedLink.case_id]);
    const caseRow = caseResult.rows[0];

    const noteResult = await query(
      `
        SELECT hn.*
        FROM handover_notes hn
        INNER JOIN handoffs h ON h.id = hn.handoff_id
        WHERE h.case_id = $1
          AND h.status IN ('pack_released', 'accepted', 'task_in_progress', 'post_action_pending', 'update_draft', 'update_verified', 'routed', 'completed', 'escalated')
        ORDER BY hn.approved_at DESC NULLS LAST, hn.created_at DESC
      `,
      [sharedLink.case_id],
    );

    return res.json({
      id: caseRow.id,
      case_title: caseRow.case_title,
      claim_number: caseRow.claim_number,
      claimant: caseRow.claimant,
      defendant: caseRow.defendant,
      forum: caseRow.forum,
      court_name: caseRow.court_name,
      next_hearing_date: caseRow.next_hearing_date,
      most_recent_operative_event: caseRow.most_recent_operative_event,
      next_procedural_step: caseRow.next_procedural_step,
      urgency: caseRow.urgency,
      handover_notes: noteResult.rows.map((row) => ({
        id: row.id,
        handoff_id: row.handoff_id,
        ai_draft: row.ai_draft,
        solicitor_edited: row.solicitor_edited,
        approved_at: row.approved_at,
      })),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to fetch shared case.' });
  }
});

module.exports = {
  publicSharedRouter,
  privateShareRouter,
};
