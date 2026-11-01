/**
 * 26 non-DE tax pools. Ledger and reserve only. No payment authority.
 */
const { AB27, estimateVat } = require("./ab27Tax");
const { roundMoney } = require("./commerceValidation");

const RESERVE_RATE = 0.25;
const POOL_COUNTRIES = Object.freeze(AB27.filter((code) => code !== "DE"));

const pools = Object.fromEntries(POOL_COUNTRIES.map((code) => [code, { postedNet: 0, reserve: 0, spendable: 0 }]));

function countryKey(country) {
  const code = String(country || "").toUpperCase();
  return code === "GR" ? "EL" : code;
}

function snapshot(country) {
  const key = countryKey(country);
  const row = pools[key];
  if (!row) return null;
  return { country: key, ...row, reserveRate: RESERVE_RATE, paymentAuthority: false };
}

function postNetIncome({ country, netIncome = 0, period = "2026-Q4" } = {}) {
  const key = countryKey(country);
  if (key === "DE") {
    return {
      ok: false,
      code: "DE_USES_PRIOR_APPROVAL_RULE",
      note: "Germany stays on the existing explicit-approval path. Not a 26-country pool.",
    };
  }
  if (!pools[key]) {
    return { ok: false, code: "NOT_A_POOL_COUNTRY", country: key };
  }
  const net = roundMoney(Math.max(0, Number(netIncome) || 0));
  const reserve = roundMoney(net * RESERVE_RATE);
  const spendable = roundMoney(net - reserve);
  const vat = estimateVat({ country: key, netAmount: net });
  pools[key].postedNet = roundMoney(pools[key].postedNet + net);
  pools[key].reserve = roundMoney(pools[key].reserve + reserve);
  pools[key].spendable = roundMoney(pools[key].spendable + spendable);
  return {
    ok: true,
    period,
    entry: { country: key, net, reserve, spendable, vat: vat.ok ? vat.vat : null },
    pool: snapshot(key),
    paymentAuthority: false,
  };
}

function listPools() {
  return POOL_COUNTRIES.map((code) => snapshot(code));
}

function payTax({ country, amount } = {}) {
  return {
    ok: false,
    code: "PAYMENT_AUTHORITY_DENIED",
    country: countryKey(country),
    amount: Number(amount) || 0,
    note: "Buzzard has no tax-payment instrument for the 26 non-DE pools.",
  };
}

function resetPools() {
  for (const code of POOL_COUNTRIES) {
    pools[code] = { postedNet: 0, reserve: 0, spendable: 0 };
  }
}

module.exports = {
  RESERVE_RATE,
  POOL_COUNTRIES,
  postNetIncome,
  listPools,
  snapshot,
  payTax,
  resetPools,
};
