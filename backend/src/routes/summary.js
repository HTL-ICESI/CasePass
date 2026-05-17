const express = require('express');
const { generateCaseSummary } = require('../services/claudeService');
const { generateSummaryPDF } = require('../services/pdfService');
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

router.post('/cases/:id/summary', async (req, res) => {
  try {
    const caseRow = await getAccessibleCase(req.params.id, req.user.id, req.user.role);
    if (!caseRow) {
      return res.status(403).json({ error: 'You do not have access to this case.' });
    }

    const [handoverNotes, postActionUpdates, alerts, checklistItems, caseUpdates, documents] = await Promise.all([
      query(
        `
          SELECT hn.*
          FROM handover_notes hn
          INNER JOIN handoffs h ON h.id = hn.handoff_id
          WHERE h.case_id = $1
          ORDER BY hn.approved_at DESC NULLS LAST, hn.created_at DESC
        `,
        [req.params.id],
      ),
      query(
        `
          SELECT pau.*
          FROM post_action_updates pau
          INNER JOIN handoffs h ON h.id = pau.handoff_id
          WHERE h.case_id = $1
          ORDER BY pau.created_at DESC
        `,
        [req.params.id],
      ),
      query('SELECT * FROM alerts WHERE case_id = $1 ORDER BY created_at DESC', [req.params.id]),
      query('SELECT * FROM checklist_items WHERE case_id = $1 ORDER BY created_at ASC', [req.params.id]),
      query('SELECT * FROM case_updates WHERE case_id = $1 ORDER BY created_at DESC', [req.params.id]),
      query('SELECT * FROM documents WHERE case_id = $1 ORDER BY uploaded_at DESC', [req.params.id]),
    ]);

    const fullCaseData = {
      ...caseRow,
      handover_notes: handoverNotes.rows,
      post_action_updates: postActionUpdates.rows,
      alerts: alerts.rows,
      checklist_items: checklistItems.rows,
      updates: caseUpdates.rows,
      documents: documents.rows,
    };

    const summaryMarkdown = await generateCaseSummary(fullCaseData);
    const pdfBuffer = await generateSummaryPDF(summaryMarkdown, fullCaseData);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="CasePass_${caseRow.case_title}_${new Date().toISOString().slice(0, 10)}.pdf"`);
    return res.send(pdfBuffer);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to generate summary PDF.' });
  }
});

module.exports = router;
