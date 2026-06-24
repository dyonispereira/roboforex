const express = require('express');
const router  = express.Router();
const db      = require('../db/database');

// POST /validate – chamado pelo EA MQL5
router.post('/validate', async (req, res) => {
  const { license_key, account, broker, symbol } = req.body;

  if (!license_key) {
    return res.status(400).json({ status: 'invalid', message: 'license_key obrigatório' });
  }

  try {
    const result = await db.query(
      'SELECT * FROM licenses WHERE license_key = $1',
      [license_key]
    );

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    if (result.rows.length === 0) {
      await logRequest(license_key, account, broker, symbol, 'not_found', ip);
      return res.status(200).json({ status: 'invalid', message: 'Licença não encontrada' });
    }

    const lic = result.rows[0];
    const now = new Date();

    if (lic.status === 'blocked') {
      await logRequest(license_key, account, broker, symbol, 'blocked', ip);
      return res.status(200).json({ status: 'blocked', message: 'Licença revogada' });
    }

    if (new Date(lic.expires_at) < now) {
      await db.query(
        "UPDATE licenses SET status='expired', updated_at=NOW() WHERE license_key=$1",
        [license_key]
      );
      await logRequest(license_key, account, broker, symbol, 'expired', ip);
      return res.status(200).json({ status: 'expired', message: 'Licença expirada' });
    }

    // Vincula conta na primeira validação
    if (!lic.account && account) {
      await db.query(
        'UPDATE licenses SET account=$1, broker=$2, symbol=$3, updated_at=NOW() WHERE license_key=$4',
        [account, broker, symbol, license_key]
      );
    }

    await logRequest(license_key, account, broker, symbol, 'active', ip);
    return res.status(200).json({
      status: 'active',
      expires_at: lic.expires_at,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Erro interno' });
  }
});

async function logRequest(license_key, account, broker, symbol, result, ip) {
  await db.query(
    'INSERT INTO license_logs (license_key,account,broker,symbol,result,ip) VALUES ($1,$2,$3,$4,$5,$6)',
    [license_key, account, broker, symbol, result, ip]
  ).catch(() => {});
}

module.exports = router;
