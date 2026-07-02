const express = require('express');
const asyncRouter = require('../utils/asyncRouter');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { isBlank } = require('../utils/validate');

const router = asyncRouter();
router.use(requireAuth);
const CAN_MANAGE = ['dg', 'raf', 'superviseur'];

router.get('/', async (req, res) => {
  const result = await db.query('SELECT * FROM interventions ORDER BY date DESC');
  res.json(result.rows);
});

router.post('/', requireRole(...CAN_MANAGE), async (req, res) => {
  const b = req.body || {};
  if (isBlank(b.client)) return res.status(400).json({ error: 'Le client est obligatoire' });
  const result = await db.query(
    `INSERT INTO interventions (client, date, agent, service, statut, description) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [b.client.trim(), b.date || new Date().toISOString().slice(0,10), b.agent || null, b.service || null, b.statut || 'Planifiee', b.description || null]
  );
  res.status(201).json(result.rows[0]);
});

router.put('/:id', requireRole(...CAN_MANAGE), async (req, res) => {
  const b = req.body || {};
  const result = await db.query(
    `UPDATE interventions SET client=$1, date=$2, agent=$3, service=$4, statut=$5, description=$6 WHERE id=$7 RETURNING *`,
    [b.client, b.date, b.agent || null, b.service || null, b.statut || 'Planifiee', b.description || null, req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Intervention introuvable' });
  res.json(result.rows[0]);
});

router.delete('/:id', requireRole(...CAN_MANAGE), async (req, res) => {
  const result = await db.query('DELETE FROM interventions WHERE id = $1 RETURNING id', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Intervention introuvable' });
  res.json({ ok: true });
});

module.exports = router;
