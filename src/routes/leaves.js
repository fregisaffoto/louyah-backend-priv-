const express = require('express');
const asyncRouter = require('../utils/asyncRouter');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { isBlank } = require('../utils/validate');

const router = asyncRouter();
router.use(requireAuth);
const ANNUAL_LEAVE_QUOTA = 26;

router.get('/', async (req, res) => {
  const result = await db.query(
    `SELECT l.*, e.nom as employee_nom FROM leaves l JOIN employees e ON e.id = l.employee_id ORDER BY l.debut DESC`
  );
  res.json(result.rows);
});

router.post('/', async (req, res) => {
  const b = req.body || {};
  if (isBlank(b.employee_id) || isBlank(b.debut) || isBlank(b.fin) || isBlank(b.motif)) {
    return res.status(400).json({ error: 'Employé, dates et motif sont obligatoires' });
  }
  if (b.fin < b.debut) {
    return res.status(400).json({ error: 'La date de fin doit être après la date de début' });
  }

  const overlap = await db.query(
    `SELECT id, debut, fin FROM leaves WHERE employee_id = $1 AND statut != 'Refuse' AND NOT ($3 < debut OR $2 > fin)`,
    [b.employee_id, b.debut, b.fin]
  );
  if (overlap.rows[0]) {
    const fmtDate = (d) => new Date(d).toISOString().slice(0, 10);
    return res.status(409).json({ error: `Une demande existe déjà sur cette période (${fmtDate(overlap.rows[0].debut)} → ${fmtDate(overlap.rows[0].fin)})` });
  }

  const jours = Math.max(1, Math.round((new Date(b.fin) - new Date(b.debut)) / (1000 * 60 * 60 * 24)) + 1);
  const type = b.type || 'Congé annuel';

  let avertissement = null;
  if (type === 'Congé annuel') {
    const annee = b.debut.slice(0, 4);
    const used = await db.query(
      `SELECT COALESCE(SUM(jours),0) as total FROM leaves WHERE employee_id=$1 AND type='Congé annuel' AND statut != 'Refuse' AND EXTRACT(YEAR FROM debut) = $2`,
      [b.employee_id, parseInt(annee, 10)]
    );
    const solde = ANNUAL_LEAVE_QUOTA - Number(used.rows[0].total);
    if (jours > solde) {
      avertissement = `Attention : solde restant ${solde} jour(s) sur ${ANNUAL_LEAVE_QUOTA} pour ${annee}. Cette demande de ${jours} jour(s) dépasse le solde.`;
    }
  }

  const result = await db.query(
    `INSERT INTO leaves (employee_id, type, debut, fin, jours, motif, statut) VALUES ($1,$2,$3,$4,$5,$6,'En attente N1') RETURNING *`,
    [b.employee_id, type, b.debut, b.fin, jours, b.motif.trim()]
  );
  res.status(201).json({ leave: result.rows[0], avertissement });
});

// PUT /api/leaves/:id/statut — validation N1/N2/RH ou refus (DG, RAF, RRH)
router.put('/:id/statut', requireRole('dg', 'raf', 'rrh'), async (req, res) => {
  const { statut, commentaire } = req.body || {};
  const valid = ['En attente N1', 'En attente N2', 'Approuve', 'Refuse'];
  if (!valid.includes(statut)) return res.status(400).json({ error: 'Statut invalide' });
  const result = await db.query(
    `UPDATE leaves SET statut=$1, commentaire=$2 WHERE id=$3 RETURNING *`,
    [statut, commentaire || null, req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Demande introuvable' });
  res.json(result.rows[0]);
});

router.delete('/:id', requireRole('dg', 'rrh'), async (req, res) => {
  const result = await db.query('DELETE FROM leaves WHERE id = $1 RETURNING id', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Demande introuvable' });
  res.json({ ok: true });
});

module.exports = router;
