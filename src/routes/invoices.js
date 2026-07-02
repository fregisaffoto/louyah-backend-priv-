const express = require('express');
const asyncRouter = require('../utils/asyncRouter');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { isBlank, isNegative } = require('../utils/validate');

const router = asyncRouter();
router.use(requireAuth);
const CAN_MANAGE = ['dg', 'raf', 'mkt'];

router.get('/', async (req, res) => {
  const { type } = req.query;
  const result = type
    ? await db.query('SELECT * FROM invoices WHERE type = $1 ORDER BY date DESC', [type])
    : await db.query('SELECT * FROM invoices ORDER BY date DESC');
  res.json(result.rows);
});

async function nextInvoiceNumber(type) {
  const prefix = type === 'devis' ? 'DEV' : 'FAC';
  const year = new Date().getFullYear();
  const result = await db.query(
    `SELECT num FROM invoices WHERE type = $1 AND num LIKE $2 ORDER BY id DESC LIMIT 1`,
    [type, `${prefix}-${year}-%`]
  );
  let seq = 1;
  if (result.rows[0]) {
    const parts = result.rows[0].num.split('-');
    seq = parseInt(parts[2], 10) + 1;
  }
  return `${prefix}-${year}-${String(seq).padStart(3, '0')}`;
}

router.post('/', requireRole(...CAN_MANAGE), async (req, res) => {
  const b = req.body || {};
  if (isBlank(b.client)) return res.status(400).json({ error: 'Le client est obligatoire' });
  if (isBlank(b.ht) || isNegative(b.ht)) return res.status(400).json({ error: 'Le montant HT doit être positif' });
  const type = b.type === 'devis' ? 'devis' : 'facture';
  const num = b.num && !isBlank(b.num) ? b.num.trim() : await nextInvoiceNumber(type);
  try {
    const result = await db.query(
      `INSERT INTO invoices (num, type, client, service, ht, date, echeance, statut)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [num, type, b.client.trim(), b.service || null, b.ht, b.date || new Date().toISOString().slice(0,10),
       b.echeance || null, b.statut || 'En attente']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Ce numéro existe déjà' });
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/:id', requireRole(...CAN_MANAGE), async (req, res) => {
  const b = req.body || {};
  if (isNegative(b.ht)) return res.status(400).json({ error: 'Le montant HT ne peut pas être négatif' });
  const result = await db.query(
    `UPDATE invoices SET client=$1, service=$2, ht=$3, date=$4, echeance=$5, statut=$6 WHERE id=$7 RETURNING *`,
    [b.client, b.service || null, b.ht, b.date, b.echeance || null, b.statut || 'En attente', req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Document introuvable' });
  res.json(result.rows[0]);
});

router.delete('/:id', requireRole('dg', 'raf'), async (req, res) => {
  const result = await db.query('DELETE FROM invoices WHERE id = $1 RETURNING id', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Document introuvable' });
  res.json({ ok: true });
});

module.exports = router;
