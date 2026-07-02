const express = require('express');
const asyncRouter = require('../utils/asyncRouter');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { isBlank } = require('../utils/validate');

const router = asyncRouter();
router.use(requireAuth);
const CAN_MANAGE = ['dg', 'mkt'];

router.get('/', requireRole(...CAN_MANAGE), async (req, res) => {
  const result = await db.query('SELECT * FROM communications ORDER BY created_at DESC');
  res.json(result.rows);
});

router.post('/', requireRole(...CAN_MANAGE), async (req, res) => {
  const b = req.body || {};
  if (isBlank(b.dest) || isBlank(b.message)) return res.status(400).json({ error: 'Destinataire et message sont obligatoires' });
  const result = await db.query(
    `INSERT INTO communications (dest, type, message, statut) VALUES ($1,$2,$3,$4) RETURNING *`,
    [b.dest.trim(), b.type || null, b.message.trim(), b.statut === 'Envoyé' ? 'Envoyé' : 'Brouillon']
  );
  res.status(201).json(result.rows[0]);
});

router.delete('/:id', requireRole(...CAN_MANAGE), async (req, res) => {
  const result = await db.query('DELETE FROM communications WHERE id = $1 RETURNING id', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Communication introuvable' });
  res.json({ ok: true });
});

module.exports = router;
