const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { requireAdmin } = require('../middleware/roles');

const router = express.Router();

router.use(requireAdmin);

router.get('/', async (_req, res) => {
  try {
    return res.json([
      {
        id: 'demo-admin',
        name: 'Demo Admin',
        email: 'admin@casepass.local',
        role: 'admin',
        active: true,
        created_at: new Date().toISOString(),
      },
    ]);
  } catch (error) {
    return res.status(500).json({ error: 'Unable to fetch users.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, email, role = 'user' } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required.' });
    }

    return res.status(201).json({
      id: uuidv4(),
      name,
      email,
      role,
      active: true,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to create user.' });
  }
});

router.put('/:id/active', async (req, res) => {
  try {
    const { active } = req.body;
    return res.json({ id: req.params.id, active: Boolean(active) });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to update user status.' });
  }
});

module.exports = router;
