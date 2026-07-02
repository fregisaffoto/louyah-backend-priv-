const express = require('express');
const asyncRouter = require('../utils/asyncRouter');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { isBlank } = require('../utils/validate');

const router = asyncRouter();
router.use(requireAuth);

const VALID_ROLES = ['dg', 'raf', 'rrh', 'mkt', 'superviseur', 'support', 'client', 'employee'];

// GET /api/users — DG uniquement (liste des comptes, sans les hachages)
router.get('/', requireRole('dg'), async (req, res) => {
  const result = await db.query('SELECT id, nom, login, role, email, tel, statut, created_at FROM users ORDER BY nom');
  res.json(result.rows);
});

// POST /api/users — DG uniquement
router.post('/', requireRole('dg'), async (req, res) => {
  const b = req.body || {};
  if (isBlank(b.nom) || isBlank(b.login) || isBlank(b.password)) {
    return res.status(400).json({ error: 'Nom, identifiant et mot de passe sont obligatoires' });
  }
  if (b.password.length < 8) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères' });
  }
  if (!VALID_ROLES.includes(b.role)) {
    return res.status(400).json({ error: 'Rôle invalide' });
  }
  try {
    const hash = await bcrypt.hash(b.password, 12);
    const result = await db.query(
      `INSERT INTO users (nom, login, password_hash, role, email, tel, statut)
       VALUES ($1,$2,$3,$4,$5,$6,'Actif') RETURNING id, nom, login, role, email, tel, statut, created_at`,
      [b.nom.trim(), b.login.trim(), hash, b.role, b.email || null, b.tel || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Cet identifiant existe déjà' });
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur lors de la création du compte' });
  }
});

// PUT /api/users/:id — DG uniquement (modifie rôle/statut/infos, pas le mot de passe ici)
router.put('/:id', requireRole('dg'), async (req, res) => {
  const b = req.body || {};
  if (b.role && !VALID_ROLES.includes(b.role)) {
    return res.status(400).json({ error: 'Rôle invalide' });
  }
  const result = await db.query(
    `UPDATE users SET nom=COALESCE($1,nom), role=COALESCE($2,role), email=COALESCE($3,email),
       tel=COALESCE($4,tel), statut=COALESCE($5,statut) WHERE id=$6
     RETURNING id, nom, login, role, email, tel, statut, created_at`,
    [b.nom, b.role, b.email, b.tel, b.statut, req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Compte introuvable' });
  res.json(result.rows[0]);
});

// DELETE /api/users/:id — DG uniquement, ne peut pas se supprimer lui-même
router.delete('/:id', requireRole('dg'), async (req, res) => {
  if (Number(req.params.id) === req.user.id) {
    return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
  }
  const result = await db.query('DELETE FROM users WHERE id = $1 RETURNING id', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Compte introuvable' });
  res.json({ ok: true });
});

// POST /api/users/:id/reset-password — DG uniquement, réinitialise le mot de passe d'un autre compte
router.post('/:id/reset-password', requireRole('dg'), async (req, res) => {
  const { newPassword } = req.body || {};
  if (isBlank(newPassword) || newPassword.length < 8) {
    return res.status(400).json({ error: 'Le nouveau mot de passe doit contenir au moins 8 caractères' });
  }
  const hash = await bcrypt.hash(newPassword, 12);
  const result = await db.query('UPDATE users SET password_hash=$1 WHERE id=$2 RETURNING id', [hash, req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Compte introuvable' });
  res.json({ ok: true });
});

// POST /api/users/me/change-password — tout utilisateur connecté change son propre mot de passe
router.post('/me/change-password', async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (isBlank(currentPassword) || isBlank(newPassword)) {
    return res.status(400).json({ error: 'Mot de passe actuel et nouveau mot de passe requis' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Le nouveau mot de passe doit contenir au moins 8 caractères' });
  }
  const result = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
  const row = result.rows[0];
  if (!row) return res.status(404).json({ error: 'Compte introuvable' });
  const valid = await bcrypt.compare(currentPassword, row.password_hash);
  if (!valid) return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
  const hash = await bcrypt.hash(newPassword, 12);
  await db.query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, req.user.id]);
  res.json({ ok: true });
});

module.exports = router;
