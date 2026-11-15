/**
 * Local coupon gate.
 * A coupon check is not a discount, an order, a payment, or a reservation.
 */
const { getCountry } = require("../buzzardNative/core/tax/countryRegistry");
const { isSalesEnabled } = require("../salesMode");

const applications = new Map();

function countryCode(value) {
  const row = getCountry(value);
  return row ? row.countryCode : null;
}

function closed(code, status, extra = {}) {
  return {
    ok: false,
    code,
    status,
    applied: false,
    discount: null,
    discountRate: null,
    discountAmount: null,
    total: null,
    commercialTotal: null,
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

function planCoupon(input = {}) {
  const code = input.code ? String(input.code).trim() : "";
  const customerId = input.customerId ? String(input.customerId) : "";
  const couponCustomerId = input.couponCustomerId == null ? customerId : String(input.couponCustomerId);
  const sku = input.sku ? String(input.sku) : "";
  const productSku = input.productSku == null ? sku : String(input.productSku);
  const country = countryCode(input.country);
  const couponCountry = countryCode(input.couponCountry);
  const key = input.idempotencyKey || `${customerId}:${code}:${input.cartId || ""}`;
  if (applications.has(key) && input.action !== "retry") {
    const prior = applications.get(key);
    return closed("DUPLICATE_COUPON", prior.status, {
      ...prior,
      code: "DUPLICATE_COUPON",
      duplicate: true,
      applied: false,
      discount: null,
      total: null,
      orderCreated: false,
      paymentCreated: false,
    });
  }

  const reasons = [];
  if (!isSalesEnabled()) reasons.push("SALES_CLOSED");
  if (input.mock === true || input.demo === true || input.synthetic === true || input.source === "mock" || input.source === "DEMO") {
    reasons.push("MOCK_NOT_CAMPAIGN");
  }
  if (!code || !customerId || !input.productId || !input.campaignId || !sku || customerId !== couponCustomerId || sku !== productSku) {
    reasons.push("COUPON_RELATION_MISMATCH");
  }
  const starts = Date.parse(String(input.startsAt || ""));
  const expires = Date.parse(String(input.expiresAt || ""));
  const now = Date.now();
  if (!Number.isFinite(starts) || !Number.isFinite(expires)) reasons.push("COUPON_WINDOW_UNKNOWN");
  else if (expires <= now) reasons.push("COUPON_EXPIRED");
  else if (starts > now) reasons.push("COUPON_NOT_STARTED");
  const usageLimit = input.usageLimit;
  const usageCount = input.usageCount;
  const customerLimit = input.customerLimit;
  const customerUses = input.customerUses;
  if (typeof usageLimit !== "number" || typeof usageCount !== "number" || typeof customerLimit !== "number" || typeof customerUses !== "number") {
    reasons.push("COUPON_LIMIT_UNKNOWN");
  } else if (usageCount >= usageLimit) reasons.push("COUPON_USAGE_EXCEEDED");
  else if (customerUses >= customerLimit) reasons.push("COUPON_CUSTOMER_LIMIT");
  const cartCurrency = String(input.currency || "").trim().toUpperCase();
  const couponCurrency = String(input.couponCurrency || "").trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(cartCurrency) || !/^[A-Z]{3}$/.test(couponCurrency)) reasons.push("CURRENCY_UNKNOWN");
  else if (cartCurrency !== couponCurrency) reasons.push("CURRENCY_MISMATCH");
  if (!country || !couponCountry) reasons.push("COUNTRY_UNKNOWN");
  else if (country !== couponCountry) reasons.push("COUNTRY_MISMATCH");
  const hasRate = typeof input.discountRate === "number" && Number.isFinite(input.discountRate);
  const hasAmount = typeof input.discountAmount === "number" && Number.isFinite(input.discountAmount);
  if (!hasRate && !hasAmount) reasons.push("DISCOUNT_UNKNOWN");
  else if (hasRate && hasAmount) reasons.push("DISCOUNT_CONFLICT");
  reasons.push("COUPON_UNVERIFIED");
  if (input.timeout === true || input.forceTimeout === true) reasons.unshift("TIMEOUT");
  if (input.networkError === true) reasons.unshift("NETWORK_ERROR");

  const found = reasons.find((reason) => reason !== "SALES_CLOSED") || "COUPON_UNVERIFIED";
  const status = found === "TIMEOUT" || found === "NETWORK_ERROR" ? "FAILED" : found === "COUPON_WINDOW_UNKNOWN" || found === "COUPON_LIMIT_UNKNOWN" || found === "DISCOUNT_UNKNOWN" || found === "COUPON_UNVERIFIED" ? "UNKNOWN" : "BLOCKED";
  const result = closed(found, status, {
    reasons,
    codeValue: code || null,
    customerId: customerId && customerId === couponCustomerId ? customerId : null,
    sku: sku && sku === productSku ? sku : null,
    campaignId: input.campaignId || null,
    country,
    couponCountry,
    currency: null,
  });
  applications.set(key, result);
  return result;
}

function retryCoupon(key) {
  const prior = key ? applications.get(key) : null;
  if (!prior) return closed("RETRY_UNKNOWN", "UNKNOWN", { attempts: 0 });
  const next = closed(prior.status === "FAILED" ? prior.code : "RETRY_NOT_APPLIED", prior.status === "FAILED" ? "FAILED" : prior.status, {
    ...prior,
    attempts: (prior.attempts || 1) + 1,
    code: prior.status === "FAILED" ? prior.code : "RETRY_NOT_APPLIED",
    applied: false,
    discount: null,
    total: null,
    orderCreated: false,
    paymentCreated: false,
    reservationCreated: false,
    duplicate: false,
  });
  applications.set(key, next);
  return next;
}

module.exports = {
  planCoupon,
  retryCoupon,
};
