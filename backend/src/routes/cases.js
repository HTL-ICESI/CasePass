const express = require('express');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

function buildPlaceholderCase(overrides = {}) {
  return {
    id: overrides.id || uuidv4(),
    name: 'Proceso Ordinario Laboral',
    radicado: '11001-31-03-001-2024-00001-00',
    plaintiff: 'Demandante de ejemplo',
    defendant: 'Demandado de ejemplo',
    last_action: 'Recepcion de documentos',
    next_action: 'Preparar resumen del expediente',
    apoderado_notes: 'Caso de ejemplo para el esqueleto inicial.',
    created_by: overrides.created_by || 'demo-admin',
    share_token: uuidv4(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

router.get('/', async (_req, res) => {
  try {
    return res.json([buildPlaceholderCase()]);
  } catch (error) {
    return res.status(500).json({ error: 'Unable to fetch cases.' });
  }
});

router.post('/', async (req, res) => {
  try {
    return res.status(201).json(buildPlaceholderCase({ ...req.body, created_by: req.user?.id || 'demo-admin' }));
  } catch (error) {
    return res.status(500).json({ error: 'Unable to create case.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    return res.json(buildPlaceholderCase({ id: req.params.id }));
  } catch (error) {
    return res.status(500).json({ error: 'Unable to fetch case.' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    return res.json(buildPlaceholderCase({ id: req.params.id, ...req.body, updated_at: new Date().toISOString() }));
  } catch (error) {
    return res.status(500).json({ error: 'Unable to update case.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    return res.json({ success: true, id: req.params.id });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to delete case.' });
  }
});

module.exports = router;
