function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access is required.' });
  }

  return next();
}

function requireUser(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authenticated user is required.' });
  }

  return next();
}

module.exports = {
  requireAdmin,
  requireUser,
};
