const express = require('express');
const { generateCaseSummary } = require('../services/claudeService');
const { generateSummaryPDF } = require('../services/pdfService');

const router = express.Router();

router.post('/cases/:id/summary', async (req, res) => {
  try {
    const caseData = {
      id: req.params.id,
      name: 'Proceso Ordinario Laboral',
      radicado: '11001-31-03-001-2024-00001-00',
      last_action: 'Recepcion de documentos',
      next_action: 'Preparar resumen del expediente',
    };

    const summaryMarkdown = await generateCaseSummary(caseData);
    const pdfBuffer = await generateSummaryPDF(summaryMarkdown, caseData);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="case-${req.params.id}-summary.pdf"`);
    return res.send(pdfBuffer);
  } catch (error) {
    return res.status(500).json({ error: 'Unable to generate summary PDF.' });
  }
});

module.exports = router;
