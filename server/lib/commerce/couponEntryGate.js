/**
 * Coupon entry gate.
 * An entered code is not a discount until FIN-M21 and FIN-M22 both authorize it.
 */
const { isSalesEnabled } = require("../salesMode");
const { planCoupon } = require("./couponGate");
const { decideCouponAuthority } = require("./couponAuthorityGate");

const entries = new Map();
const CODE_SHAPE = /^[A-Z0-9][A-Z0-9_-]{2,31}$/;

function closed(code, status, extra = {}) {
  return {
    ok: false,
    code,
    status,
    accepted: false,
    applied: false,
    authorized: false,
    discount: null,
    commercialTotal: null,
    total: null,
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
    ...extra,
  };
}

function entryCode(gate, authority) {
  const present = new Set([gate && gate.code, authority && authority.code]);
  const preferred = [
    "TIMEOUT",
    "NETWORK_ERROR",
    "MOCK_NOT_CAMPAIGN",
    "COUPON_RELATION_MISMATCH",
    "COUPON_CAMPAIGN_MISMATCH",
    "COUPON_NOT_STARTED",
    "COUPON_EXPIRED",
    "CAMPAIGN_EXPIRED",
    "CAMPAIGN_CANCELLED",
    "COUPON_USAGE_EXCEEDED",
    "COUPON_CUSTOMER_LIMIT",
    "DISCOUNT_CONFLICT",
    "COUNTRY_MISMATCH",
    "COUNTRY_SCOPE_MISMATCH",
    "CURRENCY_MISMATCH",
    "CURRENCY_SCOPE_MISMATCH",
    "COUPON_WINDOW_UNKNOWN",
    "COUPON_LIMIT_UNKNOWN",
    "DISCOUNT_UNKNOWN",
    "CURRENCY_UNKNOWN",
    "COUNTRY_UNKNOWN",
    "CAMPAIGN_SOURCE_UNKNOWN",
    "COUPON_AUTHORITY_CONFLICT",
    "CAMPAIGN_OWNER_UNVERIFIED",
    "CAMPAIGN_AUTHORITY_UNVERIFIED",
    "COUPON_UNVERIFIED",
  ];
  for (const code of preferred) {
    if (present.has(code)) return code;
  }
  return (gate && gate.code) || (authority && authority.code) || "COUPON_UNKNOWN";
}

function statusFor(code) {
  if (code === "TIMEOUT" || code === "NETWORK_ERROR") return "FAILED";
  if (
    code === "COUPON_CODE_EMPTY"
    || code === "COUPON_UNKNOWN"
    || code === "CAMPAIGN_SOURCE_UNKNOWN"
    || code === "COUPON_UNVERIFIED"
    || code === "COUPON_WINDOW_UNKNOWN"
    || code === "COUPON_LIMIT_UNKNOWN"
    || code === "DISCOUNT_UNKNOWN"
    || code === "CURRENCY_UNKNOWN"
    || code === "COUNTRY_UNKNOWN"
  ) return "UNKNOWN";
  return "BLOCKED";
}

function submitCouponEntry(input = {}) {
  const raw = input.code == null ? "" : String(input.code).trim();
  const key = input.idempotencyKey || `${input.customerId || ""}:${raw}:${input.cartId || ""}`;
  if (entries.has(key) && input.action !== "retry") {
    const prior = entries.get(key);
    return closed("DUPLICATE_COUPON_ENTRY", prior.status, {
      ...prior,
      code: "DUPLICATE_COUPON_ENTRY",
      duplicate: true,
      accepted: false,
      applied: false,
      authorized: false,
      discount: null,
      total: null,
      commercialTotal: null,
    });
  }

  const normalized = raw.toUpperCase();
  let code = "";
  let status = "BLOCKED";
  let gate = null;
  let authority = null;
  const reasons = [];
  if (!isSalesEnabled()) reasons.push("SALES_CLOSED");

  if (!raw) {
    code = "COUPON_CODE_EMPTY";
    status = "UNKNOWN";
    reasons.push(code);
  } else if (!CODE_SHAPE.test(normalized)) {
    code = "COUPON_CODE_INVALID";
    status = "BLOCKED";
    reasons.push(code);
  } else if (input.timeout === true || input.networkError === true) {
    code = input.timeout === true ? "TIMEOUT" : "NETWORK_ERROR";
    status = "FAILED";
    reasons.push(code);
  } else if (input.mock === true || input.synthetic === true || input.source === "mock" || input.source === "DEMO") {
    code = "MOCK_NOT_CAMPAIGN";
    status = "BLOCKED";
    reasons.push(code);
  } else {
    gate = planCoupon({ ...input, code: normalized, idempotencyKey: `entry-gate:${key}` });
    authority = decideCouponAuthority({
      ...input,
      code: normalized,
      gateResult: gate,
      authorityKey: `entry-auth:${key}`,
    });
    code = entryCode(gate, authority);
    status = statusFor(code);
    reasons.push(gate.code, authority.code, code);
  }

  const result = closed(code, status, {
    reasons,
    normalizedCode: normalized || null,
    gateCode: gate ? gate.code : null,
    authorityCode: authority ? authority.code : null,
    customerId: input.customerId || null,
    sku: input.sku || null,
    campaignId: input.campaignId || null,
  });
  entries.set(key, result);
  return result;
}

function retryCouponEntry(key) {
  const prior = key ? entries.get(key) : null;
  if (!prior) return closed("RETRY_UNKNOWN", "UNKNOWN", { attempts: 0 });
  const next = closed(prior.status === "FAILED" ? prior.code : "RETRY_NOT_APPLIED", prior.status === "FAILED" ? "FAILED" : prior.status, {
    ...prior,
    attempts: (prior.attempts || 1) + 1,
    code: prior.status === "FAILED" ? prior.code : "RETRY_NOT_APPLIED",
    accepted: false,
    applied: false,
    authorized: false,
    discount: null,
    total: null,
    commercialTotal: null,
    orderCreated: false,
    paymentCreated: false,
    reservationCreated: false,
    duplicate: false,
  });
  entries.set(key, next);
  return next;
}

module.exports = {
  submitCouponEntry,
  retryCouponEntry,
};
