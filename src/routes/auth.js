const express = require('express');
const asyncRouter = require('../utils/asyncRouter');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { signToken, setSessionCookie, clearSessionCookie, requireAuth } = require('../middleware/auth');

const router = asyncRouter();

// Anti brute-force très simple, en mémoire (suffisant pour une petite équipe).
// Bloque après 5 échecs consécutifs pour un même login, pendant 5 minutes.
const failedAttempts = new Map(); // login -> { count, lockedUntil }

router.post('/login', async (req, res) => {
  const { login, password } = req.body || {};
  if (!login || !password) {
    return res.status(400).json({ error: 'Identifiant et mot de passe requis' });
  }

  const attempt = failedAttempts.get(login);
  if (attempt && attempt.lockedUntil && attempt.lockedUntil > Date.now()) {
    const seconds = Math.ceil((attempt.lockedUntil - Date.now()) / 1000);
    return res.status(429).json({ error: `Trop de tentatives échouées. Réessayez dans ${seconds}s.` });
  }

  const result = await db.query(
    'SELECT id, nom, login, password_hash, role, statut FROM users WHERE login = $1',
    [login]
  );
  const user = result.rows[0];

  const fail = () => {
    const prev = failedAttempts.get(login) || { count: 0 };
    const count = prev.count + 1;
    const lockedUntil = count >= 5 ? Date.now() + 5 * 60 * 1000 : null;
    failedAttempts.set(login, { count, lockedUntil });
    return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect' });
  };

  if (!user) return fail();
  if (user.statut !== 'Actif') {
    return res.status(403).json({ error: 'Ce compte est désactivé' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return fail();

  failedAttempts.delete(login);
  const token = signToken(user);
  setSessionCookie(res, token);
  res.json({ id: user.id, nom: user.nom, login: user.login, role: user.role });
});

router.post('/logout', (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  res.json(req.user);
});

module.exports = router;
