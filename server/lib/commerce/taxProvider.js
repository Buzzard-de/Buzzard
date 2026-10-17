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
  const code = String(country || "").toUpperCase();
  if (!code) return null;
  return VAT_BY_COUNTRY[code] ?? null;
}

function calculateTax({ country, subtotal = 0, discount = 0, category = null } = {}) {
  if (category) {
    return {
      ok: false,
      code: "tax_category_rate_unknown",
      message: "No verified category VAT; country rate is not applied as category tax",
      blocked: true,
      invented: false,
    };
  }

  const rate = getTaxRate(country);
  if (rate === null) {
    return {
      ok: false,
      code: "tax_rate_unknown",
      message: "No tax rate configured for country",
      blocked: true,
      invented: false,
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
    status: "PARTIAL",
    live: false,
    fiscalLive: false,
    invented: false,
    countriesConfigured: Object.keys(VAT_BY_COUNTRY).length,
    note: "Configured country rates only. Unknown country/category stay blocked. Not a live fiscal engine.",
  };
}

module.exports = {
  VAT_BY_COUNTRY,
  getTaxRate,
  calculateTax,
  getProviderHealth,
};
