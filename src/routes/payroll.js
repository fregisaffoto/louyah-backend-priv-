const express = require('express');
const asyncRouter = require('../utils/asyncRouter');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { calcEmployeePay } = require('../utils/payroll-calc');

const router = asyncRouter();
const CAN_MANAGE_PAY = ['dg', 'raf'];

router.use(requireAuth);

// GET /api/payroll/config
router.get('/config', async (req, res) => {
  const result = await db.query('SELECT * FROM payroll_config WHERE id = 1');
  res.json(result.rows[0]);
});

// PUT /api/payroll/config — DG, RAF uniquement
router.put('/config', requireRole(...CAN_MANAGE_PAY), async (req, res) => {
  const b = req.body || {};
  const nums = ['smig', 'plafond', 'tx_sal', 'tx_pat', 'atmp', 'transport'];
  for (const k of nums) {
    if (b[k] != null && Number(b[k]) < 0) {
      return res.status(400).json({ error: `${k} ne peut pas être négatif` });
    }
  }
  const result = await db.query(
    `UPDATE payroll_config SET smig=$1, plafond=$2, tx_sal=$3, tx_pat=$4, atmp=$5, transport=$6 WHERE id=1 RETURNING *`,
    [b.smig, b.plafond, b.tx_sal, b.tx_pat, b.atmp, b.transport]
  );
  res.json(result.rows[0]);
});

// GET /api/payroll/preview/:employeeId — calcul en direct sans enregistrer (pour aperçu bulletin)
router.get('/preview/:employeeId', async (req, res) => {
  const empResult = await db.query('SELECT * FROM employees WHERE id = $1', [req.params.employeeId]);
  const employee = empResult.rows[0];
  if (!employee) return res.status(404).json({ error: 'Employé introuvable' });
  const confResult = await db.query('SELECT * FROM payroll_config WHERE id = 1');
  const pay = calcEmployeePay(employee, confResult.rows[0]);
  res.json({ employee, pay });
});

// GET /api/payroll/bulletins?mois=Juin 2025
router.get('/bulletins', async (req, res) => {
  const mois = req.query.mois;
  const params = mois ? [mois] : [];
  const sql = mois
    ? `SELECT p.*, e.nom, e.matricule, e.poste FROM payslips p JOIN employees e ON e.id = p.employee_id WHERE p.mois = $1 ORDER BY e.nom`
    : `SELECT p.*, e.nom, e.matricule, e.poste FROM payslips p JOIN employees e ON e.id = p.employee_id ORDER BY p.mois DESC, e.nom`;
  const result = await db.query(sql, params);
  res.json(result.rows);
});

// POST /api/payroll/generate { mois: "Juin 2025" } — génère/écrase les bulletins de TOUS les employés actifs pour ce mois
router.post('/generate', requireRole(...CAN_MANAGE_PAY), async (req, res) => {
  const { mois } = req.body || {};
  if (!mois || !mois.trim()) return res.status(400).json({ error: 'Le mois est obligatoire (ex: "Juin 2025")' });

  const confResult = await db.query('SELECT * FROM payroll_config WHERE id = 1');
  const config = confResult.rows[0];
  const empResult = await db.query(`SELECT * FROM employees WHERE statut = 'Actif'`);

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const generated = [];
    for (const employee of empResult.rows) {
      const pay = calcEmployeePay(employee, config);
      const result = await client.query(
        `INSERT INTO payslips (employee_id, mois, brut, cnps_sal, cnps_pat, its, transport, net, statut)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'Genere')
         ON CONFLICT (employee_id, mois) DO UPDATE SET
           brut=EXCLUDED.brut, cnps_sal=EXCLUDED.cnps_sal, cnps_pat=EXCLUDED.cnps_pat,
           its=EXCLUDED.its, transport=EXCLUDED.transport, net=EXCLUDED.net, statut='Genere'
         RETURNING *`,
        [employee.id, mois.trim(), pay.brut, pay.cnpsSal, pay.cnpsPat, pay.its, pay.transport, pay.net]
      );
      generated.push(result.rows[0]);
    }
    await client.query('COMMIT');
    res.status(201).json({ count: generated.length, bulletins: generated });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la génération des bulletins' });
  } finally {
    client.release();
  }
});

// GET /api/payroll/declaration-sociale?mois=Juin 2025 — totaux CNPS pour la déclaration
router.get('/declaration-sociale', async (req, res) => {
  const mois = req.query.mois;
  if (!mois) return res.status(400).json({ error: 'Paramètre mois requis' });
  const result = await db.query(
    `SELECT e.matricule, e.cnps, e.nom, p.brut, p.cnps_sal, p.cnps_pat
     FROM payslips p JOIN employees e ON e.id = p.employee_id
     WHERE p.mois = $1 ORDER BY e.nom`,
    [mois]
  );
  const totals = result.rows.reduce((acc, r) => {
    acc.cnpsSal += Number(r.cnps_sal);
    acc.cnpsPat += Number(r.cnps_pat);
    return acc;
  }, { cnpsSal: 0, cnpsPat: 0 });
  res.json({ mois, lignes: result.rows, totaux: totals });
});

module.exports = router;
