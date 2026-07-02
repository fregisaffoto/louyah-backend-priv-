const express = require('express');
const asyncRouter = require('../utils/asyncRouter');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = asyncRouter();
const CAN_MANAGE = ['dg', 'raf', 'rrh'];

router.use(requireAuth);

// GET /api/employees — liste (tous les rôles connectés peuvent consulter)
router.get('/', async (req, res) => {
  const result = await db.query('SELECT * FROM employees ORDER BY nom ASC');
  res.json(result.rows);
});

// GET /api/employees/:id
router.get('/:id', async (req, res) => {
  const result = await db.query('SELECT * FROM employees WHERE id = $1', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Employé introuvable' });
  res.json(result.rows[0]);
});

// POST /api/employees — création (DG, RAF, RRH uniquement)
router.post('/', requireRole(...CAN_MANAGE), async (req, res) => {
  const b = req.body || {};
  if (!b.nom || !b.nom.trim()) return res.status(400).json({ error: 'Le nom est obligatoire' });
  if (b.salaire_base != null && Number(b.salaire_base) < 0) {
    return res.status(400).json({ error: 'Le salaire de base ne peut pas être négatif' });
  }
  try {
    const result = await db.query(
      `INSERT INTO employees (matricule, nom, poste, service, contrat, date_entree, date_sortie, statut, salaire_base, cnps, nationalite, genre, photo_data)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [b.matricule || null, b.nom.trim(), b.poste || null, b.service || null, b.contrat || 'CDI',
       b.date_entree || null, b.date_sortie || null, b.statut || 'Actif', b.salaire_base || 0,
       b.cnps || null, b.nationalite || null, b.genre || null, b.photo_data || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Ce matricule existe déjà' });
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur lors de la création' });
  }
});

// PUT /api/employees/:id — modification (DG, RAF, RRH uniquement)
router.put('/:id', requireRole(...CAN_MANAGE), async (req, res) => {
  const b = req.body || {};
  if (b.salaire_base != null && Number(b.salaire_base) < 0) {
    return res.status(400).json({ error: 'Le salaire de base ne peut pas être négatif' });
  }
  try {
    const result = await db.query(
      `UPDATE employees SET
         matricule=$1, nom=$2, poste=$3, service=$4, contrat=$5, date_entree=$6, date_sortie=$7,
         statut=$8, salaire_base=$9, cnps=$10, nationalite=$11, genre=$12,
         photo_data=COALESCE($13, photo_data), updated_at=now()
       WHERE id=$14 RETURNING *`,
      [b.matricule || null, b.nom, b.poste || null, b.service || null, b.contrat || 'CDI',
       b.date_entree || null, b.date_sortie || null, b.statut || 'Actif', b.salaire_base || 0,
       b.cnps || null, b.nationalite || null, b.genre || null, b.photo_data || null, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Employé introuvable' });
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Ce matricule existe déjà' });
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur lors de la mise à jour' });
  }
});

// DELETE /api/employees/:id — suppression (DG, RRH uniquement — pas le RAF)
router.delete('/:id', requireRole('dg', 'rrh'), async (req, res) => {
  const result = await db.query('DELETE FROM employees WHERE id = $1 RETURNING id', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Employé introuvable' });
  res.json({ ok: true });
});

module.exports = router;
