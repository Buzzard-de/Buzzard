/**
 * Tax Connect: local filing queue only. Never talks to a tax authority.
 */
const crypto = require("crypto");
const { estimateVat, AB27 } = require("./ab27Tax");

const REQUIRED = Object.freeze(["BUZZARD_TAX_CONNECT_URL", "BUZZARD_TAX_CONNECT_KEY"]);

const filings = [];

function assess() {
  const missing = REQUIRED.filter((key) => !process.env[key]);
  return {
    status: missing.length ? "BLOCKED" : "CODE_READY",
    connected: false,
    filingEnabled: false,
    queueReady: true,
    missing,
    note: missing.length
      ? "Queue works locally. Live filing BLOCKED — no Tax Connect account."
      : "Credentials present — live filing still requires human approval.",
  };
}

function enqueueCountryReport({ country, netAmount = 0, period = "2026-Q4" } = {}) {
  const vat = estimateVat({ country, netAmount });
  if (!vat.ok) return vat;
  const item = {
    id: `tax_${crypto.randomBytes(6).toString("hex")}`,
    country: vat.country,
    period,
    net: vat.net,
    vat: vat.vat,
    status: "WAITING_HUMAN",
    submitted: false,
    createdAt: new Date().toISOString(),
  };
  filings.push(item);
  return { ok: true, item };
}

function listFilings() {
  return filings.map((f) => ({ ...f }));
}

function submitFiling(id) {
  return {
    ok: false,
    code: "TAX_CONNECT_BLOCKED",
    id: id || null,
    ...assess(),
  };
}

module.exports = { REQUIRED, AB27, assess, enqueueCountryReport, listFilings, submitFiling };
