const express = require('express');
const asyncRouter = require('../utils/asyncRouter');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { isBlank } = require('../utils/validate');

const router = asyncRouter();
router.use(requireAuth);
const CAN_MANAGE = ['dg', 'rrh'];

router.get('/', async (req, res) => {
  const result = await db.query('SELECT * FROM trainings ORDER BY date DESC');
  res.json(result.rows);
});

router.post('/', requireRole(...CAN_MANAGE), async (req, res) => {
  const b = req.body || {};
  if (isBlank(b.titre)) return res.status(400).json({ error: 'Le titre est obligatoire' });
  const result = await db.query(
    `INSERT INTO trainings (titre, formateur, date, duree, participants, statut) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [b.titre.trim(), b.formateur || null, b.date || null, b.duree || null, b.participants || null, b.statut || 'Planifiée']
  );
  res.status(201).json(result.rows[0]);
});

router.put('/:id', requireRole(...CAN_MANAGE), async (req, res) => {
  const b = req.body || {};
  const result = await db.query(
    `UPDATE trainings SET titre=$1, formateur=$2, date=$3, duree=$4, participants=$5, statut=$6 WHERE id=$7 RETURNING *`,
    [b.titre, b.formateur || null, b.date || null, b.duree || null, b.participants || null, b.statut || 'Planifiée', req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Formation introuvable' });
  res.json(result.rows[0]);
});

router.delete('/:id', requireRole(...CAN_MANAGE), async (req, res) => {
  const result = await db.query('DELETE FROM trainings WHERE id = $1 RETURNING id', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Formation introuvable' });
  res.json({ ok: true });
});

module.exports = router;
