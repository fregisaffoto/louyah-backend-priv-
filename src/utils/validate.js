function isBlank(v) {
  return v == null || String(v).trim() === '';
}
function isNegative(v) {
  return v != null && Number(v) < 0;
}
module.exports = { isBlank, isNegative };
