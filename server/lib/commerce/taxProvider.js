/**
 * Tax calculation stays unknown until a verified country rate is supplied.
 * This module does not keep a substitute rate table.
 */
function calculateTax({ country, rate } = {}) {
  return {
    ok: false,
    status: "UNKNOWN",
    code: "VAT_UNVERIFIED",
    official: false,
    verified: false,
    country: String(country || "").toUpperCase() || null,
    rate: null,
    tax: null,
    callerRateIgnored: rate != null,
    invented: false,
    filingReady: false,
    dryRun: true,
    provider: "foundation",
  };
}

function getTaxRate(country) {
  const assessed = calculateTax({ country });
  if (assessed.official !== true || assessed.verified !== true || typeof assessed.rate !== "number") return null;
  return assessed.rate;
}

function getProviderHealth() {
  return {
    provider: "foundation",
    status: "UNVERIFIED",
    countriesConfigured: 0,
    official: false,
    note: "Stored country rates are not used as an official tax calculation",
  };
}

module.exports = {
  getTaxRate,
  calculateTax,
  getProviderHealth,
};
