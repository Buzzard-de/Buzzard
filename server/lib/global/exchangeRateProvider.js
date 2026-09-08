/**
 * Mock/dry-run exchange rate provider — no live financial API.
 */
const MOCK_RATES_TO_EUR = Object.freeze({
  EUR: 1,
  GBP: 0.86,
  CHF: 0.95,
  PLN: 4.3,
  CZK: 25.2,
  HUF: 390,
  RON: 4.97,
  BGN: 1.96,
  DKK: 7.46,
  SEK: 11.2,
  NOK: 11.5,
  ISK: 148,
  USD: 1.08,
  CAD: 1.47,
  AUD: 1.65,
  NZD: 1.78,
  AED: 3.97,
  SAR: 4.05,
  TRY: 34.5,
});

function convertAmount(amount, fromCurrency, toCurrency) {
  const from = String(fromCurrency || "EUR").toUpperCase();
  const to = String(toCurrency || "EUR").toUpperCase();
  const value = Number(amount) || 0;
  const fromRate = MOCK_RATES_TO_EUR[from] || 1;
  const toRate = MOCK_RATES_TO_EUR[to] || 1;
  const eurValue = value / fromRate;
  return {
    amount: eurValue * toRate,
    from,
    to,
    rate: (MOCK_RATES_TO_EUR[to] || 1) / fromRate,
    provider: "mock_dry_run",
    live: false,
  };
}

module.exports = {
  MOCK_RATES_TO_EUR,
  convertAmount,
};
