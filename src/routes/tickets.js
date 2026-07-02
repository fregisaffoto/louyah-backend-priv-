const express = require('express');
const asyncRouter = require('../utils/asyncRouter');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { isBlank } = require('../utils/validate');

const router = asyncRouter();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const result = await db.query('SELECT * FROM tickets ORDER BY created_at DESC');
  res.json(result.rows);
});

router.post('/', async (req, res) => {
  const b = req.body || {};
  if (isBlank(b.nom) || isBlank(b.sujet)) return res.status(400).json({ error: 'Nom et sujet sont obligatoires' });
  const result = await db.query(
    `INSERT INTO tickets (nom, categorie, sujet, priorite, statut, description) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [b.nom.trim(), b.categorie || null, b.sujet.trim(), b.priorite || 'normal', 'Ouvert', b.description || null]
  );
  res.status(201).json(result.rows[0]);
});

router.put('/:id', requireRole('dg', 'support'), async (req, res) => {
  const b = req.body || {};
  const result = await db.query(
    `UPDATE tickets SET statut=COALESCE($1,statut), priorite=COALESCE($2,priorite) WHERE id=$3 RETURNING *`,
    [b.statut, b.priorite, req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Ticket introuvable' });
  res.json(result.rows[0]);
});

module.exports = router;
