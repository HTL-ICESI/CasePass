const express = require('express');
const { v4: uuidv4 } = require('uuid');

const publicSharedRouter = express.Router();
const privateShareRouter = express.Router();

privateShareRouter.post('/cases/:id/share', async (req, res) => {
  try {
    const token = uuidv4();
    const appUrl = process.env.APP_URL || 'http://localhost:5173';

    return res.json({
      token,
      url: `${appUrl}/shared/${token}`,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to create share link.' });
  }
});

publicSharedRouter.get('/shared/:token', async (req, res) => {
  try {
    return res.json({
      id: req.params.token,
      name: 'Caso Compartido',
      radicado: '11001-31-03-001-2024-00001-00',
      plaintiff: 'Demandante de ejemplo',
      defendant: 'Demandado de ejemplo',
      last_action: 'Recepcion de documentos',
      next_action: 'Preparar resumen del expediente',
      apoderado_notes: 'Vista compartida de solo lectura.',
      documents: [],
    });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to fetch shared case.' });
  }
});

module.exports = {
  publicSharedRouter,
  privateShareRouter,
};
