const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'change-me-in-production';

function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (!token || token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Não autorizado' });
  }
  next();
}

module.exports = { requireAdmin };
