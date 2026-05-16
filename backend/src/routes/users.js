const express = require('express');
const bcrypt = require('bcryptjs');
const { requireAdmin } = require('../middleware/roles');
const { query } = require('../db');

const router = express.Router();

router.use(requireAdmin);

router.get('/', async (_req, res) => {
  try {
    const result = await query(
      `
        SELECT id, name, email, role, legal_role, active, created_at
        FROM users
        ORDER BY created_at ASC
      `,
    );

    return res.json(result.rows);
  } catch (error) {
    return res.status(500).json({ error: 'Unable to fetch users.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, email, password = 'casepass123', role = 'user', legal_role = null } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await query(
      `
        INSERT INTO users (name, email, password_hash, role, legal_role, active)
        VALUES ($1, $2, $3, $4, $5, TRUE)
        RETURNING id, name, email, role, legal_role, active, created_at
      `,
      [name, email, passwordHash, role, legal_role],
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'A user with that email already exists.' });
    }

    return res.status(500).json({ error: 'Unable to create user.' });
  }
});

router.put('/:id/active', async (req, res) => {
  try {
    const { active } = req.body;
    const result = await query(
      `
        UPDATE users
        SET active = $2
        WHERE id = $1
        RETURNING id, name, email, role, legal_role, active, created_at
      `,
      [req.params.id, Boolean(active)],
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'User not found.' });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ error: 'Unable to update user status.' });
  }
});

module.exports = router;
