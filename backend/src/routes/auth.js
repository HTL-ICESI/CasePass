const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roles');
const { query } = require('../db');

const router = express.Router();

function buildTokenPayload(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    legal_role: user.legal_role,
    active: user.active,
  };
}

async function createInitialAdmin(email, password) {
  const passwordHash = await bcrypt.hash(password, 12);
  const result = await query(
    `
      INSERT INTO users (name, email, password_hash, role, legal_role, active)
      VALUES ($1, $2, $3, 'admin', 'solicitor_on_record', TRUE)
      RETURNING id, name, email, role, legal_role, active, created_at
    `,
    ['Initial Admin', email, passwordHash],
  );

  return result.rows[0];
}

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const secret = process.env.JWT_SECRET || 'change-me';
    let userResult = await query(
      `
        SELECT id, name, email, password_hash, role, legal_role, active, created_at
        FROM users
        WHERE email = $1
      `,
      [email],
    );

    let user = userResult.rows[0] || null;

    if (!user) {
      const countResult = await query('SELECT COUNT(*)::int AS total FROM users');
      const totalUsers = countResult.rows[0].total;

      if (totalUsers === 0 && process.env.ALLOW_DEV_BOOTSTRAP !== 'false') {
        user = await createInitialAdmin(email, password);
        userResult = { rows: [{ ...user, password_hash: await bcrypt.hash(password, 12) }] };
      } else {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }
    }

    const passwordHash = user.password_hash || userResult.rows[0].password_hash;
    const passwordMatches = await bcrypt.compare(password, passwordHash);

    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (!user.active) {
      return res.status(403).json({ error: 'User account is inactive.' });
    }

    const tokenPayload = buildTokenPayload(user);
    const token = jwt.sign(tokenPayload, secret, { expiresIn: '7d' });
    return res.json({ token, user: tokenPayload });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to complete login.' });
  }
});

router.post('/register', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, email, password, role = 'user', legal_role = null } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const result = await query(
      `
        INSERT INTO users (name, email, password_hash, role, legal_role, active)
        VALUES ($1, $2, $3, $4, $5, TRUE)
        RETURNING id, name, email, role, legal_role, active, created_at
      `,
      [name, email, password_hash, role, legal_role],
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'A user with that email already exists.' });
    }

    return res.status(500).json({ error: 'Unable to register user.' });
  }
});

module.exports = router;
