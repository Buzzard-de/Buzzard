/**
 * Part 8 — Tax calculation foundation (no hard-coded wrong VAT for go-live)
 */
const { roundMoney } = require("./commerceValidation");

const VAT_BY_COUNTRY = Object.freeze({
  DE: 19,
  AT: 20,
  FR: 20,
  IT: 22,
  ES: 21,
  BE: 21,
  NL: 21,
  PL: 23,
});

function getTaxRate(country) {
  const code = String(country || "DE").toUpperCase();
  return VAT_BY_COUNTRY[code] ?? null;
}

function calculateTax({ country = "DE", subtotal = 0, discount = 0 } = {}) {
  const rate = getTaxRate(country);
  if (rate === null) {
    return {
      ok: false,
      code: "tax_rate_unknown",
      message: `No tax rate configured for country ${country}`,
      blocked: true,
    };
  }

  const base = roundMoney(Math.max(0, Number(subtotal) - Number(discount)));
  const tax = roundMoney((base * rate) / 100);

  return {
    ok: true,
    country: String(country).toUpperCase(),
    rate,
    taxBase: base,
    tax,
    currency: "EUR",
    provider: "foundation",
    dryRun: true,
  };
}

function getProviderHealth() {
  return {
    provider: "foundation",
    status: "READY",
    countriesConfigured: Object.keys(VAT_BY_COUNTRY).length,
    note: "Replace with real tax engine before go-live",
  };
}

module.exports = {
  VAT_BY_COUNTRY,
  getTaxRate,
  calculateTax,
  getProviderHealth,
};
