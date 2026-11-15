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

function convert({ amount, from = "EUR", to = "EUR" } = {}) {
  const src = RATES_EUR[String(from).toUpperCase()];
  const dst = RATES_EUR[String(to).toUpperCase()];
  if (src == null || dst == null) {
    return { ok: false, code: "UNKNOWN_CURRENCY", live: false };
  }
  const value = Number(amount) || 0;
  const eur = value / src;
  return {
    ok: true,
    live: false,
    from: String(from).toUpperCase(),
    to: String(to).toUpperCase(),
    amount: value,
    converted: Number((eur * dst).toFixed(4)),
    rateSource: "FIXTURE",
  };
}

module.exports = { RATES_EUR, convert };
