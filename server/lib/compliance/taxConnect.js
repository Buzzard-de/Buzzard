/**
 * AB-27 tax/institution connect. Filing drafts only. No payment, no portal scrape.
 */
const { AB27, assess, inventory: commerceInventory } = require("../commerce/taxConnect");

const CHANNELS = Object.freeze(["official_api", "xml", "secure_message", "e_filing"]);

function countryChannel(code) {
  return {
    country: code,
    channels: CHANNELS,
    live: false,
    sandbox: false,
    credential: false,
    scrapeForbidden: true,
    filingMayPay: false,
    paymentAuthority: code === "DE" ? "SEPARATE_EXPLICIT_FRAMEWORK" : "DENIED",
    status: "BLOCKED",
    reason: "No official sandbox credential in this environment.",
  };
}

function inventory() {
  return commerceInventory().map((row) => ({
    ...countryChannel(row.country),
    ...row,
  }));
}

function prepareDeclaration({ country, period, figures } = {}) {
  const row = countryChannel(String(country || "").toUpperCase());
  if (!AB27.includes(row.country) && row.country !== "GR") {
    return { ok: false, code: "UNKNOWN_COUNTRY" };
  }
  return {
    ok: true,
    draft: true,
    submitted: false,
    paid: false,
    country: row.country === "GR" ? "EL" : row.country,
    period: period || null,
    figures: figures || {},
    channel: row,
  };
}

function submitDeclaration() {
  return {
    ok: false,
    submitted: false,
    code: "LIVE_INTEGRATION_BLOCKED",
    note: "Official filing requires authorized certificates. Not converted to payment.",
  };
}

module.exports = { CHANNELS, inventory, countryChannel, prepareDeclaration, submitDeclaration, assess };
