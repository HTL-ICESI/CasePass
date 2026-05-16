const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roles');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const secret = process.env.JWT_SECRET || 'change-me';
    const user = {
      id: uuidv4(),
      name: 'Demo Admin',
      email,
      role: 'admin',
      active: true,
    };

    const token = jwt.sign(user, secret, { expiresIn: '8h' });
    return res.json({ token, user });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to complete login.' });
  }
});

router.post('/register', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, email, password, role = 'user' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    return res.status(201).json({
      id: uuidv4(),
      name,
      email,
      role,
      active: true,
      password_hash,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to register user.' });
  }
});

module.exports = router;
