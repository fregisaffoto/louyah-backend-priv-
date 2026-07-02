const express = require('express');
const asyncRouter = require('../utils/asyncRouter');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = asyncRouter();
router.use(requireAuth);
router.use(requireRole('dg', 'raf'));

async function getTotals() {
  const ca = await db.query(`SELECT COALESCE(SUM(ht),0) as total FROM invoices WHERE type = 'facture'`);
  const depenses = await db.query(`SELECT COALESCE(SUM(montant),0) as total FROM expenses`);
  const masse = await db.query(`SELECT COALESCE(SUM(salaire_base),0) as total FROM employees WHERE statut = 'Actif'`);
  const stock = await db.query(`SELECT COALESCE(SUM(stock * valeur),0) as total FROM materials`);
  const t = {
    ca: Number(ca.rows[0].total),
    depenses: Number(depenses.rows[0].total),
    masse: Number(masse.rows[0].total),
    stock: Number(stock.rows[0].total)
  };
  t.resultat = t.ca - t.depenses - t.masse;
  return t;
}

router.get('/synthese', async (req, res) => {
  res.json(await getTotals());
});

router.get('/compte-resultat', async (req, res) => {
  const t = await getTotals();
  res.json({
    lignes: [
      { libelle: "Chiffre d'affaires (HT)", montant: t.ca },
      { libelle: 'Charges de personnel (masse salariale)', montant: t.masse },
      { libelle: "Autres charges d'exploitation (dépenses)", montant: t.depenses }
    ],
    resultatNet: t.resultat
  });
});

router.get('/bilan', async (req, res) => {
  const t = await getTotals();
  res.json({
    actif: [
      { libelle: 'Stock de matériel', montant: t.stock },
      { libelle: 'Créances clients (CA)', montant: t.ca }
    ],
    passif: [
      { libelle: "Résultat de l'exercice", montant: t.resultat },
      { libelle: 'Charges à payer (dépenses + masse)', montant: t.depenses + t.masse }
    ]
  });
});

router.get('/grand-livre', async (req, res) => {
  const factures = await db.query(`SELECT date, client, num, ht FROM invoices WHERE type='facture' ORDER BY date`);
  const depenses = await db.query(`SELECT date, categorie, description, montant FROM expenses ORDER BY date`);
  const lignes = [
    ...factures.rows.map(f => ({ date: f.date, compte: '707 — Ventes de services', libelle: `${f.client} (${f.num})`, debit: Number(f.ht), credit: 0 })),
    ...depenses.rows.map(d => ({ date: d.date, compte: `6 — ${d.categorie || 'Charges'}`, libelle: d.description, debit: 0, credit: Number(d.montant) }))
  ].sort((a, b) => new Date(a.date) - new Date(b.date));
  res.json(lignes);
});

router.get('/balance', async (req, res) => {
  const t = await getTotals();
  res.json([
    { compte: '707 — Ventes de services', debit: t.ca, credit: 0 },
    { compte: "6 — Charges d'exploitation", debit: 0, credit: t.depenses },
    { compte: '64 — Charges de personnel', debit: 0, credit: t.masse },
    { compte: '37 — Stock de matériel', debit: t.stock, credit: 0 }
  ]);
});

module.exports = router;
