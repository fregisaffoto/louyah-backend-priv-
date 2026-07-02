// Reproduit fidèlement les formules utilisées dans l'application LOUYAH GESTION
// (fonctions calcCNPS / calcITS / calcEmp de l'app d'origine), pour que les
// bulletins générés côté serveur donnent EXACTEMENT les mêmes montants.

function calcCNPS(brut, plafond, txSal, txPat) {
  const base = Math.min(brut, plafond);
  return {
    sal: Math.round((base * txSal) / 100),
    pat: Math.round((base * txPat) / 100)
  };
}

// Barème ITS progressif (Côte d'Ivoire) — identique à l'app d'origine
function calcITS(netImposable) {
  if (netImposable <= 300000) return 0;
  if (netImposable <= 600000) return Math.round(netImposable * 0.05 - 15000);
  if (netImposable <= 1200000) return Math.round(netImposable * 0.15 - 75000);
  if (netImposable <= 3600000) return Math.round(netImposable * 0.25 - 195000);
  return Math.round(netImposable * 0.35 - 555000);
}

// employee: { salaire_base }, config: { plafond, tx_sal, tx_pat, transport }
function calcEmployeePay(employee, config) {
  const brut = Number(employee.salaire_base);
  const plafond = Number(config.plafond);
  const txSal = Number(config.tx_sal);
  const txPat = Number(config.tx_pat);
  const transport = Number(config.transport);

  const cnps = calcCNPS(brut, plafond, txSal, txPat);
  const its = calcITS(brut - cnps.sal);
  const net = brut - cnps.sal - its + transport;

  return {
    brut,
    cnpsSal: cnps.sal,
    cnpsPat: cnps.pat,
    its,
    transport,
    net,
    txSal,
    txPat,
    plafond
  };
}

module.exports = { calcCNPS, calcITS, calcEmployeePay };
