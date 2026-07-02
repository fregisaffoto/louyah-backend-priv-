const express = require('express');
const asyncRouter = require('../utils/asyncRouter');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { isBlank, isNegative } = require('../utils/validate');

const router = asyncRouter();
router.use(requireAuth);
const CAN_MANAGE = ['dg', 'raf', 'mkt'];

router.get('/', async (req, res) => {
  const result = await db.query('SELECT * FROM clients ORDER BY nom');
  res.json(result.rows);
});

router.get('/:id', async (req, res) => {
  const result = await db.query('SELECT * FROM clients WHERE id = $1', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Client introuvable' });
  res.json(result.rows[0]);
});

router.post('/', requireRole(...CAN_MANAGE), async (req, res) => {
  const b = req.body || {};
  if (isBlank(b.nom)) return res.status(400).json({ error: 'Le nom du client est obligatoire' });
  if (isNegative(b.ca_annuel)) return res.status(400).json({ error: 'Le CA annuel ne peut pas être négatif' });
  const result = await db.query(
    `INSERT INTO clients (nom, secteur, ca_annuel, statut, contact_email, contact_tel, adresse)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [b.nom.trim(), b.secteur || null, b.ca_annuel || 0, b.statut || 'Prospect', b.contact_email || null, b.contact_tel || null, b.adresse || null]
  );
  res.status(201).json(result.rows[0]);
});

router.put('/:id', requireRole(...CAN_MANAGE), async (req, res) => {
  const b = req.body || {};
  if (isNegative(b.ca_annuel)) return res.status(400).json({ error: 'Le CA annuel ne peut pas être négatif' });
  const result = await db.query(
    `UPDATE clients SET nom=$1, secteur=$2, ca_annuel=$3, statut=$4, contact_email=$5, contact_tel=$6, adresse=$7, updated_at=now()
     WHERE id=$8 RETURNING *`,
    [b.nom, b.secteur || null, b.ca_annuel || 0, b.statut || 'Prospect', b.contact_email || null, b.contact_tel || null, b.adresse || null, req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Client introuvable' });
  res.json(result.rows[0]);
});

router.delete('/:id', requireRole('dg', 'raf'), async (req, res) => {
  const result = await db.query('DELETE FROM clients WHERE id = $1 RETURNING id', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Client introuvable' });
  res.json({ ok: true });
});

module.exports = router;
