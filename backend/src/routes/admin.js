const express      = require('express');
const router       = express.Router();
const crypto       = require('crypto');
const db           = require('../db/database');
const { requireAdmin } = require('../middleware/auth');

// GET /admin/licenses – listar todas
router.get('/licenses', requireAdmin, async (req, res) => {
  const result = await db.query(
    'SELECT * FROM licenses ORDER BY created_at DESC'
  );
  res.json(result.rows);
});

// POST /admin/licenses – criar licença
router.post('/licenses', requireAdmin, async (req, res) => {
  const { expires_at, account, broker, symbol } = req.body;
  if (!expires_at) return res.status(400).json({ error: 'expires_at obrigatório' });

  const license_key = crypto.randomBytes(16).toString('hex').toUpperCase();

  const result = await db.query(
    `INSERT INTO licenses (license_key, status, account, broker, symbol, expires_at)
     VALUES ($1, 'active', $2, $3, $4, $5) RETURNING *`,
    [license_key, account || null, broker || null, symbol || null, expires_at]
  );
  res.status(201).json(result.rows[0]);
});

// PATCH /admin/licenses/:key/revoke – revogar
router.patch('/licenses/:key/revoke', requireAdmin, async (req, res) => {
  await db.query(
    "UPDATE licenses SET status='blocked', updated_at=NOW() WHERE license_key=$1",
    [req.params.key]
  );
  res.json({ message: 'Licença revogada' });
});

// PATCH /admin/licenses/:key/activate – reativar
router.patch('/licenses/:key/activate', requireAdmin, async (req, res) => {
  const { expires_at } = req.body;
  await db.query(
    "UPDATE licenses SET status='active', expires_at=COALESCE($1,expires_at), updated_at=NOW() WHERE license_key=$2",
    [expires_at || null, req.params.key]
  );
  res.json({ message: 'Licença reativada' });
});

// DELETE /admin/licenses/:key – excluir
router.delete('/licenses/:key', requireAdmin, async (req, res) => {
  await db.query('DELETE FROM licenses WHERE license_key=$1', [req.params.key]);
  res.json({ message: 'Licença excluída' });
});

// GET /admin/logs – últimos logs
router.get('/logs', requireAdmin, async (req, res) => {
  const result = await db.query(
    'SELECT * FROM license_logs ORDER BY created_at DESC LIMIT 200'
  );
  res.json(result.rows);
});

module.exports = router;
