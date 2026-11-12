/**
 * Tax calculation stays unknown until a verified country rate is supplied.
 * This module does not keep a substitute rate table.
 */
function getTaxRate() {
  return null;
}

function calculateTax({ country } = {}) {
  return {
    ok: false,
    status: "UNKNOWN",
    code: "VAT_UNVERIFIED",
    official: false,
    country: String(country || "").toUpperCase() || null,
    rate: null,
    tax: null,
    invented: false,
    filingReady: false,
    dryRun: true,
    provider: "foundation",
  };
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
