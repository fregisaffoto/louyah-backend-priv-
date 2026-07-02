const express = require('express');
const asyncRouter = require('../utils/asyncRouter');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = asyncRouter();
router.use(requireAuth);
const CAN_MANAGE = ['dg', 'rrh', 'superviseur'];

function mondayOf(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

// GET /api/planning?week=2026-06-29 — retourne toutes les entrées de la semaine (par défaut la semaine courante)
router.get('/', async (req, res) => {
  const weekStart = mondayOf(req.query.week);
  const result = await db.query(
    `SELECT p.*, e.nom as employee_nom FROM planning_entries p JOIN employees e ON e.id = p.employee_id WHERE week_start = $1`,
    [weekStart]
  );
  res.json({ weekStart, entries: result.rows });
});

// PUT /api/planning — upsert une case (employé, jour, type)
router.put('/', requireRole(...CAN_MANAGE), async (req, res) => {
  const { employee_id, week, day_index, type } = req.body || {};
  if (employee_id == null || day_index == null) {
    return res.status(400).json({ error: 'employee_id et day_index sont obligatoires' });
  }
  if (day_index < 0 || day_index > 5) return res.status(400).json({ error: 'day_index doit être entre 0 et 5' });
  const weekStart = mondayOf(week);
  const validTypes = ['assigned', 'leave', 'training', 'empty'];
  const t = validTypes.includes(type) ? type : 'empty';

  if (t === 'empty') {
    await db.query(
      `DELETE FROM planning_entries WHERE employee_id=$1 AND week_start=$2 AND day_index=$3`,
      [employee_id, weekStart, day_index]
    );
    return res.json({ ok: true, cleared: true });
  }
  const result = await db.query(
    `INSERT INTO planning_entries (employee_id, week_start, day_index, type) VALUES ($1,$2,$3,$4)
     ON CONFLICT (employee_id, week_start, day_index) DO UPDATE SET type=EXCLUDED.type RETURNING *`,
    [employee_id, weekStart, day_index, t]
  );
  res.json(result.rows[0]);
});

module.exports = router;
