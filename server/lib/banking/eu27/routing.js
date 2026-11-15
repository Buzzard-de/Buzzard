/**
 * Sandbox routing. Live inventory rows are never eligible.
 * A fixture may be scored only when it is explicitly non-live and licence/contract checked.
 */
const { decideAsset } = require("./fiatPolicy");
const { isVerifiedMethod } = require("./payments");

function eligible(candidate, { countryCode, currency, methodId }) {
  if (!candidate || candidate.fixture !== true || candidate.live !== false) return false;
  if (candidate.licenseStatus !== "LICENSE_VERIFIED") return false;
  if (candidate.contractStatus !== "CONTRACT_VERIFIED") return false;
  if (candidate.connectorStatus !== "SANDBOX_VERIFIED") return false;
  if (candidate.countryCode !== countryCode) return false;
  if (!Array.isArray(candidate.currencies) || !candidate.currencies.includes(currency)) return false;
  if (!Array.isArray(candidate.methods) || !candidate.methods.includes(methodId)) return false;
  if (candidate.screening !== "CLEAR_FIXTURE") return false;
  return true;
}

function score(candidate) {
  const cost = Number(candidate.costBps) || 0;
  const success = Number(candidate.successBps) || 0;
  const seconds = Number(candidate.settlementSeconds) || 0;
  const refund = Number(candidate.refundCostBps) || 0;
  const risk = Number(candidate.riskBps) || 0;
  return success - cost - refund - risk - Math.min(seconds, 86400) / 100;
}

function route({ countryCode, currency, methodId, assetType = "fiat", candidates = [], sandboxMethodOverride = false } = {}) {
  const fiat = decideAsset({ currency, assetType, instrument: methodId });
  if (!fiat.ok) return { ...fiat, live: false, moneyMoved: false, provider: null };
  const code = String(countryCode || "").toUpperCase();
  const method = isVerifiedMethod(code, methodId);
  if (!method.ok && sandboxMethodOverride !== true) {
    return { ok: false, code: method.code, live: false, moneyMoved: false, provider: null };
  }
  const pool = candidates.filter((candidate) => eligible(candidate, { countryCode: code, currency: fiat.currency, methodId }));
  if (!pool.length) {
    return {
      ok: false,
      code: "NO_ELIGIBLE_PROVIDER",
      live: false,
      moneyMoved: false,
      provider: null,
      methodVerification: method.code,
    };
  }
  const ranked = [...pool].sort((a, b) => score(b) - score(a) || String(a.id).localeCompare(String(b.id)));
  return {
    ok: true,
    code: "SANDBOX_ROUTE",
    currency: fiat.currency,
    live: false,
    moneyMoved: false,
    provider: { id: ranked[0].id, fixture: true, live: false },
    alternatives: ranked.slice(1).map((candidate) => candidate.id),
  };
}

module.exports = { route, score };
