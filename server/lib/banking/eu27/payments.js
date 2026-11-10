/**
 * Payment-method catalogue. Market Engine capabilities are configuration, not a licence.
 */
const { getMarketPaymentCapabilities } = require("../../../core/marketEngineRegistry");
const { eu27Countries } = require("./inventory");

const METHOD_IDS = Object.freeze([
  "visa",
  "mastercard",
  "sepa_credit_transfer",
  "sepa_instant",
  "sepa_direct_debit",
  "local_bank_transfer",
  "local_bank_card",
  "paypal",
  "klarna",
  "apple_pay",
  "google_pay",
  "licensed_local_provider",
]);

const MARKET_CAPABILITY_MAP = Object.freeze({
  card: ["visa", "mastercard"],
  sepa: ["sepa_credit_transfer", "sepa_instant", "sepa_direct_debit"],
  paypal: ["paypal"],
  klarna: ["klarna"],
});

function methodsForCountry(countryCode) {
  const code = String(countryCode || "").toUpperCase();
  const configured = new Set();
  for (const capability of getMarketPaymentCapabilities(code)) {
    for (const methodId of MARKET_CAPABILITY_MAP[capability] || []) configured.add(methodId);
  }
  return METHOD_IDS.map((methodId) => ({
    methodId,
    countryCode: code,
    configuredInMarketEngine: configured.has(methodId),
    verificationStatus: "UNVERIFIED",
    licenseVerified: false,
    contractVerified: false,
    live: false,
    localSchemeName: methodId === "licensed_local_provider" || methodId === "local_bank_card" || methodId === "local_bank_transfer"
      ? null
      : undefined,
  }));
}

function catalogue() {
  return eu27Countries().map((country) => ({
    ...country,
    methods: methodsForCountry(country.countryCode),
  }));
}

function isVerifiedMethod(countryCode, methodId) {
  const method = methodsForCountry(countryCode).find((row) => row.methodId === methodId);
  if (!method) return { ok: false, code: "UNKNOWN_METHOD", live: false };
  if (!method.licenseVerified || method.verificationStatus !== "VERIFIED") {
    return { ok: false, code: "METHOD_NOT_VERIFIED", live: false, method };
  }
  return { ok: true, method };
}

module.exports = { METHOD_IDS, methodsForCountry, catalogue, isVerifiedMethod };
