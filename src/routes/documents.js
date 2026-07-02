const express = require('express');
const asyncRouter = require('../utils/asyncRouter');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { isBlank } = require('../utils/validate');

const router = asyncRouter();
router.use(requireAuth);

// Liste sans le contenu (data) pour rester léger
router.get('/', async (req, res) => {
  const result = await db.query('SELECT id, nom, type, taille_ko, created_at FROM documents ORDER BY created_at DESC');
  res.json(result.rows);
});

router.get('/:id', async (req, res) => {
  const result = await db.query('SELECT * FROM documents WHERE id = $1', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Document introuvable' });
  res.json(result.rows[0]);
});

router.post('/', async (req, res) => {
  const b = req.body || {};
  if (isBlank(b.nom) || isBlank(b.data)) return res.status(400).json({ error: 'Nom et contenu du fichier requis' });
  const result = await db.query(
    `INSERT INTO documents (nom, type, taille_ko, data) VALUES ($1,$2,$3,$4) RETURNING id, nom, type, taille_ko, created_at`,
    [b.nom.trim(), b.type || null, b.taille_ko || null, b.data]
  );
  res.status(201).json(result.rows[0]);
});

router.delete('/:id', async (req, res) => {
  const result = await db.query('DELETE FROM documents WHERE id = $1 RETURNING id', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Document introuvable' });
  res.json({ ok: true });
});

module.exports = router;
