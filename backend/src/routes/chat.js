const express = require('express');
const { searchChunks } = require('../services/ragService');
const { chatWithSources } = require('../services/claudeService');
const { query } = require('../db');

const router = express.Router();

async function getAccessibleCase(caseId, userId, role) {
  const result = await query(
    `
      SELECT *
      FROM cases
      WHERE id = $1
        AND (
          $3 = 'admin'
          OR created_by = $2
          OR solicitor_on_record_id = $2
          OR EXISTS (
            SELECT 1 FROM handoffs h
            WHERE h.case_id = cases.id
              AND h.receiving_solicitor_id = $2
          )
        )
    `,
    [caseId, userId, role],
  );

  return result.rows[0] || null;
}

router.post('/cases/:id/chat', async (req, res) => {
  try {
    const { question, handoff_id: handoffId = null } = req.body;

    if (!question) {
      return res.status(422).json({ error: 'A question is required.' });
    }

    const caseRow = await getAccessibleCase(req.params.id, req.user.id, req.user.role);
    if (!caseRow) {
      return res.status(403).json({ error: 'You do not have access to this case.' });
    }

    let resolvedHandoffId = handoffId;
    if (resolvedHandoffId) {
      const handoffResult = await query(
        'SELECT * FROM handoffs WHERE id = $1 AND case_id = $2',
        [resolvedHandoffId, req.params.id],
      );
      const handoff = handoffResult.rows[0];

      if (!handoff) {
        return res.status(404).json({ error: 'Handoff not found.' });
      }

      if (!['pack_released', 'accepted', 'task_in_progress', 'post_action_pending', 'update_draft', 'update_verified', 'routed', 'completed', 'escalated'].includes(handoff.status)) {
        return res.status(403).json({
          error: 'Chat is available once the handover pack has been released.',
          code: 'PACK_NOT_RELEASED',
        });
      }
    } else {
      const handoffResult = await query(
        `
          SELECT id
          FROM handoffs
          WHERE case_id = $1
            AND status IN ('pack_released', 'accepted', 'task_in_progress', 'post_action_pending', 'update_draft', 'update_verified', 'routed', 'completed', 'escalated')
          ORDER BY created_at DESC
          LIMIT 1
        `,
        [req.params.id],
      );
      resolvedHandoffId = handoffResult.rows[0]?.id || null;
    }

    if (!resolvedHandoffId) {
      return res.json({
        answer: 'Insufficient evidence in the file to answer this question.',
        sources: [],
      });
    }

    const chunks = await searchChunks(question, resolvedHandoffId, 5);

    if (chunks.length === 0 || chunks.every((chunk) => chunk.score < 0.5)) {
      return res.json({
        answer: 'Insufficient evidence in the file to answer this question.',
        sources: [],
      });
    }

    const response = await chatWithSources(question, chunks, {
      handoff_id: resolvedHandoffId,
      case_title: caseRow.case_title,
      forum: caseRow.forum,
      claimant: caseRow.claimant,
      defendant: caseRow.defendant,
    });

    return res.json(response);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to process chat request.' });
  }
});

module.exports = router;
