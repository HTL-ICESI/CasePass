const express = require('express');
const { searchChunks } = require('../services/ragService');
const { chatWithSources } = require('../services/claudeService');

const router = express.Router();

router.post('/cases/:id/chat', async (req, res) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'A question is required.' });
    }

    const chunks = await searchChunks(question, req.params.id, 5);
    const response = await chatWithSources(question, chunks);
    return res.json(response);
  } catch (error) {
    return res.status(500).json({ error: 'Unable to process chat request.' });
  }
});

module.exports = router;
