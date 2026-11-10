/**
 * Frozen fiat-only rule. No agent and no automatic path can loosen it.
 * Unknown assets are rejected. Crypto and CBDC are rejected under separate codes.
 */
const { EU_COUNTRY_CODES, getMarket } = require("../../../core/marketEngineRegistry");

const CRYPTO_CODES = new Set([
  "BTC", "ETH", "USDT", "USDC", "USDE", "DAI", "BUSD", "TUSD", "XRP", "SOL",
  "ADA", "DOGE", "BNB", "TON", "TRX", "WBTC", "WETH",
]);

const FORBIDDEN_ASSET_TYPES = new Set([
  "crypto",
  "cryptocurrency",
  "stablecoin",
  "nft",
  "token",
  "crypto_token",
  "digital_asset",
  "tokenized",
  "tokenized_asset",
  "wallet_crypto",
]);

const CBDC_MARKERS = new Set(["cbdc", "retail_cbdc", "wholesale_cbdc", "digital_euro"]);

function euFiatCurrencies() {
  const currencies = new Set();
  for (const code of EU_COUNTRY_CODES) {
    const market = getMarket(code);
    if (market && market.currency) currencies.add(String(market.currency).toUpperCase());
  }
  return currencies;
}

const POLICY = Object.freeze({
  id: "FIAT_ONLY",
  version: 2,
  mutable: false,
  aiMayChange: false,
  humanLooseningImplemented: false,
  FIAT_ONLY: true,
  CRYPTO_PAYMENT_ALLOWED: false,
  CBDC_PAYMENT_ALLOWED: false,
  acceptedAssetType: "fiat",
  forbiddenAssetTypes: Object.freeze([...FORBIDDEN_ASSET_TYPES]),
  cryptoCodes: Object.freeze([...CRYPTO_CODES]),
  cbdcMarkers: Object.freeze([...CBDC_MARKERS]),
});

function normalizeCode(value) {
  return String(value || "").trim().toUpperCase();
}

function decideAsset({ currency, assetType = "fiat", instrument } = {}) {
  const code = normalizeCode(currency);
  const type = String(assetType || "").trim().toLowerCase();
  const rail = String(instrument || "").trim().toLowerCase();
  const fiat = euFiatCurrencies();
  if (CBDC_MARKERS.has(type) || CBDC_MARKERS.has(rail) || CBDC_MARKERS.has(code.toLowerCase())) {
    return { ok: false, code: "REJECTED_CBDC_POLICY", currency: code || null, assetClass: "cbdc", applied: true, policyId: POLICY.id };
  }
  if (
    CRYPTO_CODES.has(code) ||
    FORBIDDEN_ASSET_TYPES.has(type) ||
    FORBIDDEN_ASSET_TYPES.has(rail) ||
    rail.includes("crypto") ||
    rail.includes("bitcoin") ||
    rail.includes("stablecoin")
  ) {
    return { ok: false, code: "REJECTED_CRYPTO_POLICY", currency: code || null, assetClass: "crypto", applied: true, policyId: POLICY.id };
  }
  if (!code || !fiat.has(code) || (type && type !== "fiat")) {
    return { ok: false, code: "REJECTED_UNKNOWN_ASSET", currency: code || null, applied: true, policyId: POLICY.id };
  }
  return { ok: true, code: "FIAT_ACCEPTED", currency: code, assetType: "fiat", policyId: POLICY.id };
}

function requestPolicyChange({ actorId = "unknown", actorKind = "ai", humanApproval = false } = {}) {
  const kind = String(actorKind || "ai").toLowerCase();
  if (kind === "ai" || kind === "agent") {
    return {
      ok: false,
      code: "AI_POLICY_CHANGE_DENIED",
      applied: false,
      actorId,
      policy: POLICY.id,
    };
  }
  if (!humanApproval) {
    return {
      ok: false,
      code: "HUMAN_GATE_REQUIRED",
      applied: false,
      actorId,
      policy: POLICY.id,
    };
  }
  return {
    ok: false,
    code: "POLICY_IMMUTABLE",
    applied: false,
    actorId,
    policy: POLICY.id,
    message: "Human approval is recorded as a request only. This build does not loosen FIAT_ONLY.",
  };
}

module.exports = {
  POLICY,
  CRYPTO_CODES,
  euFiatCurrencies,
  decideAsset,
  requestPolicyChange,
};
