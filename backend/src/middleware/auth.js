const jwt = require('jsonwebtoken');
const { query } = require('../db');

async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: 'Authentication token is required.' });
    }

    const secret = process.env.JWT_SECRET || 'change-me';
    const decoded = jwt.verify(token, secret);
    const result = await query(
      `
        SELECT id, name, email, role, legal_role, active, created_at
        FROM users
        WHERE id = $1
      `,
      [decoded.id],
    );

    if (!result.rows[0] || !result.rows[0].active) {
      return res.status(401).json({ error: 'Authenticated user is not active.' });
    }

    req.user = result.rows[0];
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
}

module.exports = {
  authenticateToken,
};
