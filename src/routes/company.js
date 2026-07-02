const express = require('express');
const asyncRouter = require('../utils/asyncRouter');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = asyncRouter();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const result = await db.query('SELECT * FROM company_info WHERE id = 1');
  res.json(result.rows[0]);
});

router.put('/', requireRole('dg'), async (req, res) => {
  const b = req.body || {};
  const result = await db.query(
    `UPDATE company_info SET nom=COALESCE($1,nom), rccm=COALESCE($2,rccm), nif=COALESCE($3,nif),
       tel=COALESCE($4,tel), email=COALESCE($5,email), adresse=COALESCE($6,adresse) WHERE id=1 RETURNING *`,
    [b.nom, b.rccm, b.nif, b.tel, b.email, b.adresse]
  );
  res.json(result.rows[0]);
});

module.exports = router;
