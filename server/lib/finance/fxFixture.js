/**
 * Frozen synthetic FX table for tests. Not a live rate feed.
 */
const RATES_EUR = Object.freeze({
  EUR: 1,
  USD: 1.08,
  GBP: 0.86,
  TRY: 37.5,
  PLN: 4.3,
});

function readAmount(value) {
  if (value == null || value === "") return { present: false, value: null };
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return { invalid: true, value: null };
  if (!/^\d+(\.\d{1,4})?$/.test(String(value))) return { invalid: true, value: null };
  return { present: true, value };
}

function convert({ amount, from = "EUR", to = "EUR" } = {}) {
  const src = RATES_EUR[String(from).toUpperCase()];
  const dst = RATES_EUR[String(to).toUpperCase()];
  if (src == null || dst == null) {
    return { ok: false, code: "UNKNOWN_CURRENCY", live: false, converted: null };
  }
  const money = readAmount(amount);
  if (!money.present || money.invalid) {
    return {
      ok: false,
      code: money.invalid ? "INVALID_AMOUNT" : "AMOUNT_UNKNOWN",
      live: false,
      converted: null,
      amount: null,
      rateSource: "FIXTURE",
    };
  }
  const eur = money.value / src;
  return {
    ok: false,
    live: false,
    code: "FX_UNVERIFIED",
    from: String(from).toUpperCase(),
    to: String(to).toUpperCase(),
    amount: money.value,
    converted: Number((eur * dst).toFixed(4)),
    rateSource: "FIXTURE",
    official: false,
  };
}

module.exports = { RATES_EUR, convert };
