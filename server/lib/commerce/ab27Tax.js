/**
 * AB27 standard VAT snapshot. Filing stays human-approved.
 * Snapshot is not a live tax authority feed.
 */
const { roundMoney } = require("./commerceValidation");

const SNAPSHOT = Object.freeze({
  retrievedAt: "2026-10-22",
  source: "https://taxation-customs.ec.europa.eu/vat-rates_en",
  note: "Standard rates only. Reduced rates and filings require a licensed tax engine + human review.",
});

const STANDARD_VAT = Object.freeze({
  AT: 20,
  BE: 21,
  BG: 20,
  CY: 19,
  CZ: 21,
  DE: 19,
  DK: 25,
  EE: 24,
  EL: 24,
  ES: 21,
  FI: 25.5,
  FR: 20,
  HR: 25,
  HU: 27,
  IE: 23,
  IT: 22,
  LT: 21,
  LU: 17,
  LV: 21,
  MT: 18,
  NL: 21,
  PL: 23,
  PT: 23,
  RO: 21,
  SE: 25,
  SI: 22,
  SK: 23,
});

const AB27 = Object.freeze(Object.keys(STANDARD_VAT));

function getStandardVat(country) {
  const code = String(country || "").toUpperCase();
  const mapped = code === "GR" ? "EL" : code;
  return STANDARD_VAT[mapped] ?? null;
}

function estimateVat({ country, netAmount = 0 } = {}) {
  const rate = getStandardVat(country);
  if (rate == null) {
    return { ok: false, code: "VAT_UNKNOWN", blocked: true, country };
  }
  const net = roundMoney(Math.max(0, Number(netAmount) || 0));
  const vat = roundMoney((net * rate) / 100);
  return {
    ok: true,
    country: String(country).toUpperCase(),
    rate,
    net,
    vat,
    gross: roundMoney(net + vat),
    currency: "EUR",
    snapshot: SNAPSHOT,
    filingReady: false,
  };
}

module.exports = {
  SNAPSHOT,
  STANDARD_VAT,
  AB27,
  getStandardVat,
  estimateVat,
};
