const express = require('express');
const asyncRouter = require('../utils/asyncRouter');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { isBlank, isNegative } = require('../utils/validate');

const router = asyncRouter();
router.use(requireAuth);
const CAN_MANAGE = ['dg', 'raf'];

router.get('/', async (req, res) => {
  const result = await db.query('SELECT * FROM expenses ORDER BY date DESC');
  res.json(result.rows);
});

router.post('/', requireRole(...CAN_MANAGE), async (req, res) => {
  const b = req.body || {};
  if (isBlank(b.description)) return res.status(400).json({ error: 'La description est obligatoire' });
  if (isNegative(b.montant)) return res.status(400).json({ error: 'Le montant ne peut pas être négatif' });
  const result = await db.query(
    `INSERT INTO expenses (date, categorie, description, fournisseur, montant, mode) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [b.date || new Date().toISOString().slice(0,10), b.categorie || null, b.description.trim(), b.fournisseur || null, b.montant || 0, b.mode || null]
  );
  res.status(201).json(result.rows[0]);
});

router.put('/:id', requireRole(...CAN_MANAGE), async (req, res) => {
  const b = req.body || {};
  if (isNegative(b.montant)) return res.status(400).json({ error: 'Le montant ne peut pas être négatif' });
  const result = await db.query(
    `UPDATE expenses SET date=$1, categorie=$2, description=$3, fournisseur=$4, montant=$5, mode=$6 WHERE id=$7 RETURNING *`,
    [b.date, b.categorie || null, b.description, b.fournisseur || null, b.montant || 0, b.mode || null, req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Dépense introuvable' });
  res.json(result.rows[0]);
});

router.delete('/:id', requireRole(...CAN_MANAGE), async (req, res) => {
  const result = await db.query('DELETE FROM expenses WHERE id = $1 RETURNING id', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Dépense introuvable' });
  res.json({ ok: true });
});

module.exports = router;
