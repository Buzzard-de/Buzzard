/**
 * Local coupon authority.
 * Campaign arithmetic is not a commercial discount.
 */
const { getCountry } = require("../buzzardNative/core/tax/countryRegistry");
const { isSalesEnabled } = require("../salesMode");
const { planCoupon } = require("./couponGate");

const decisions = new Map();

function countryCode(value) {
  const row = getCountry(value);
  return row ? row.countryCode : null;
}

function closed(code, status, extra = {}) {
  return {
    ok: false,
    code,
    status,
    authorized: false,
    applied: false,
    discount: null,
    discountAmount: null,
    total: null,
    commercialTotal: null,
    sourceStatus: "UNKNOWN",
    sourceReliability: "UNVERIFIED",
    orderCreated: false,
    paymentCreated: false,
    reservationCreated: false,
    purchased: false,
    live: false,
    commercial: false,
    productionReady: false,
    callerFlagIgnored: true,
    duplicate: false,
    attempts: 1,
    selectedAuthority: null,
    ...extra,
  };
}

const PRESERVED_GATE_CODES = new Set([
  "TIMEOUT",
  "NETWORK_ERROR",
  "MOCK_NOT_CAMPAIGN",
  "COUPON_RELATION_MISMATCH",
  "COUPON_WINDOW_UNKNOWN",
  "COUPON_EXPIRED",
  "COUPON_NOT_STARTED",
  "COUPON_LIMIT_UNKNOWN",
  "COUPON_USAGE_EXCEEDED",
  "COUPON_CUSTOMER_LIMIT",
  "CURRENCY_UNKNOWN",
  "CURRENCY_MISMATCH",
  "COUNTRY_UNKNOWN",
  "COUNTRY_MISMATCH",
  "DISCOUNT_UNKNOWN",
  "DISCOUNT_CONFLICT",
  "DUPLICATE_COUPON",
]);

function decideCouponAuthority(input = {}) {
  const gate = planCoupon({
    ...input,
    idempotencyKey: `gate:${input.authorityKey || input.idempotencyKey || input.code || "coupon"}`,
  });
  const source = input.authoritySource ? String(input.authoritySource) : "";
  const campaignId = input.campaignId ? String(input.campaignId) : "";
  const couponCampaignId = input.couponCampaignId == null ? campaignId : String(input.couponCampaignId);
  const campaignCode = input.campaignCode == null ? String(input.code || "") : String(input.campaignCode);
  const couponCode = input.code ? String(input.code) : "";
  const ownerId = input.ownerId ? String(input.ownerId) : "";
  const country = countryCode(input.country);
  const campaignCountry = countryCode(input.campaignCountry);
  const cartCurrency = String(input.currency || "").trim().toUpperCase();
  const campaignCurrency = String(input.campaignCurrency || "").trim().toUpperCase();
  const key = input.authorityKey || input.idempotencyKey || `${campaignId}:${couponCode}:${country || ""}`;
  if (decisions.has(key) && input.action !== "retry") {
    const prior = decisions.get(key);
    return closed("DUPLICATE_AUTHORITY", prior.status, {
      ...prior,
      code: "DUPLICATE_AUTHORITY",
      duplicate: true,
      authorized: false,
      discount: null,
      discountAmount: null,
      total: null,
      commercialTotal: null,
      gateCode: gate.code,
      gateApplied: false,
    });
  }

  const reasons = [];
  if (!isSalesEnabled()) reasons.push("SALES_CLOSED");
  if (gate && gate.code) reasons.push(gate.code);
  if (input.mock === true || input.synthetic === true || input.source === "mock" || source === "mock" || source === "DEMO") {
    reasons.push("MOCK_NOT_CAMPAIGN");
  }
  if (!source || source === "unknown") reasons.push("CAMPAIGN_SOURCE_UNKNOWN");
  if (!campaignId || !couponCode || campaignId !== couponCampaignId || campaignCode !== couponCode) {
    reasons.push("COUPON_CAMPAIGN_MISMATCH");
  }
  if (input.campaignStatus === "cancelled" || input.cancelled === true) reasons.push("CAMPAIGN_CANCELLED");
  const expires = Date.parse(String(input.expiresAt || ""));
  if (Number.isFinite(expires) && expires <= Date.now()) reasons.push("CAMPAIGN_EXPIRED");
  if (input.conflictingAuthority && String(input.conflictingAuthority) !== source) reasons.push("COUPON_AUTHORITY_CONFLICT");
  if (!country || !campaignCountry) reasons.push("COUNTRY_SCOPE_UNKNOWN");
  else if (country !== campaignCountry) reasons.push("COUNTRY_SCOPE_MISMATCH");
  if (!/^[A-Z]{3}$/.test(cartCurrency) || !/^[A-Z]{3}$/.test(campaignCurrency)) reasons.push("CURRENCY_SCOPE_UNKNOWN");
  else if (cartCurrency !== campaignCurrency) reasons.push("CURRENCY_SCOPE_MISMATCH");
  reasons.push("CAMPAIGN_OWNER_UNVERIFIED");
  reasons.push("CAMPAIGN_AUTHORITY_UNVERIFIED");
  if (input.timeout === true || input.forceTimeout === true) reasons.unshift("TIMEOUT");
  if (input.networkError === true) reasons.unshift("NETWORK_ERROR");

  const skip = new Set(["SALES_CLOSED"]);
  if (!PRESERVED_GATE_CODES.has(gate && gate.code)) skip.add(gate && gate.code);
  const found = reasons.find((reason) => !skip.has(reason)) || "CAMPAIGN_AUTHORITY_UNVERIFIED";
  const status = found === "TIMEOUT" || found === "NETWORK_ERROR"
    ? "FAILED"
    : found === "CAMPAIGN_SOURCE_UNKNOWN" || found === "COUNTRY_SCOPE_UNKNOWN" || found === "CURRENCY_SCOPE_UNKNOWN" || found === "CAMPAIGN_AUTHORITY_UNVERIFIED" || found === "COUPON_WINDOW_UNKNOWN" || found === "COUPON_LIMIT_UNKNOWN" || found === "DISCOUNT_UNKNOWN" || found === "COUPON_UNVERIFIED" || found === "CURRENCY_UNKNOWN" || found === "COUNTRY_UNKNOWN"
      ? "UNKNOWN"
      : "BLOCKED";
  const result = closed(found, status, {
    reasons,
    gateCode: gate.code || null,
    gateApplied: false,
    callerGateIgnored: input.gateResult != null,
    campaignId: campaignId || null,
    ownerId: ownerId || null,
    authoritySource: source && source !== "unknown" && source !== "mock" ? source : null,
    country,
    campaignCountry,
    currency: null,
  });
  decisions.set(key, result);
  return result;
}

function retryCouponAuthority(key) {
  const prior = key ? decisions.get(key) : null;
  if (!prior) return closed("RETRY_UNKNOWN", "UNKNOWN", { attempts: 0 });
  const next = closed(prior.status === "FAILED" ? prior.code : "RETRY_NOT_APPLIED", prior.status === "FAILED" ? "FAILED" : prior.status, {
    ...prior,
    attempts: (prior.attempts || 1) + 1,
    code: prior.status === "FAILED" ? prior.code : "RETRY_NOT_APPLIED",
    authorized: false,
    applied: false,
    discount: null,
    orderCreated: false,
    paymentCreated: false,
    reservationCreated: false,
    duplicate: false,
  });
  decisions.set(key, next);
  return next;
}

module.exports = {
  decideCouponAuthority,
  retryCouponAuthority,
};
