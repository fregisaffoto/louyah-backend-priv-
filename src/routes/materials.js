const express = require('express');
const asyncRouter = require('../utils/asyncRouter');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { isBlank, isNegative } = require('../utils/validate');

const router = asyncRouter();
router.use(requireAuth);
const CAN_MANAGE = ['dg', 'raf', 'superviseur'];

router.get('/', async (req, res) => {
  const result = await db.query('SELECT * FROM materials ORDER BY nom');
  res.json(result.rows);
});

router.post('/', requireRole(...CAN_MANAGE), async (req, res) => {
  const b = req.body || {};
  if (isBlank(b.nom)) return res.status(400).json({ error: 'Le nom de l\'article est obligatoire' });
  if (isNegative(b.stock) || isNegative(b.valeur)) return res.status(400).json({ error: 'Le stock et la valeur ne peuvent pas être négatifs' });
  try {
    const result = await db.query(
      `INSERT INTO materials (ref, nom, categorie, stock, stock_min, valeur) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [b.ref || null, b.nom.trim(), b.categorie || null, b.stock || 0, b.stock_min || 5, b.valeur || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Cette référence existe déjà' });
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/:id', requireRole(...CAN_MANAGE), async (req, res) => {
  const b = req.body || {};
  if (isNegative(b.stock) || isNegative(b.valeur)) return res.status(400).json({ error: 'Le stock et la valeur ne peuvent pas être négatifs' });
  const result = await db.query(
    `UPDATE materials SET ref=$1, nom=$2, categorie=$3, stock=$4, stock_min=$5, valeur=$6, updated_at=now() WHERE id=$7 RETURNING *`,
    [b.ref || null, b.nom, b.categorie || null, b.stock || 0, b.stock_min || 5, b.valeur || 0, req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Article introuvable' });
  res.json(result.rows[0]);
});

router.delete('/:id', requireRole(...CAN_MANAGE), async (req, res) => {
  const result = await db.query('DELETE FROM materials WHERE id = $1 RETURNING id', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Article introuvable' });
  res.json({ ok: true });
});

module.exports = router;
