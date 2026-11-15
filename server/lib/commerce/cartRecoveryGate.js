/**
 * Local cart recovery gate.
 * A recovery check is not a sale, a payment, a reservation, or a message.
 */
const { isSalesEnabled } = require("../salesMode");
const { readMarketingConsent } = require("./marketingConsentGate");

const decisions = new Map();
const ABANDONED_MS = 24 * 60 * 60 * 1000;
const OPEN_ORDERS = new Set(["active", "open", "completed", "paid", "pending"]);

function closed(code, status, extra = {}) {
  return {
    ok: false,
    code,
    status,
    recovered: false,
    converted: false,
    sale: false,
    revenue: null,
    price: null,
    currency: null,
    items: null,
    priceGuaranteed: false,
    stockGuaranteed: false,
    couponAdded: false,
    emailSent: false,
    smsSent: false,
    pushSent: false,
    messageSent: false,
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

function statusFor(code) {
  if (code === "TIMEOUT" || code === "NETWORK_ERROR") return "FAILED";
  if (code === "CART_OWNER_UNKNOWN" || code === "CONSENT_UNKNOWN" || code === "CHANNEL_UNKNOWN" || code === "CART_NOT_ABANDONED") return "UNKNOWN";
  return "BLOCKED";
}

const PERMISSION_FIELDS = {
  email: "emailPermission",
  sms: "smsPermission",
  push: "pushPermission",
};

function consentCode(permission) {
  if (permission == null || permission === "" || permission === "UNKNOWN") return "CONSENT_UNKNOWN";
  if (permission === "WITHDRAWN") return "CONSENT_WITHDRAWN";
  return "CONSENT_REQUIRED";
}

function assessCartRecovery(input = {}) {
  const customerId = input.customerId ? String(input.customerId) : "";
  const cartCustomerId = input.cartCustomerId == null ? "" : String(input.cartCustomerId);
  const cartId = input.cartId ? String(input.cartId) : "";
  const channel = String(input.channel || "email").toLowerCase();
  const key = input.idempotencyKey || `${customerId}:${cartId}:${channel}`;
  if (decisions.has(key) && input.action !== "retry") {
    const prior = decisions.get(key);
    return closed("DUPLICATE_RECOVERY", prior.status, {
      ...prior,
      code: "DUPLICATE_RECOVERY",
      duplicate: true,
      recovered: false,
      emailSent: false,
      smsSent: false,
      pushSent: false,
      messageSent: false,
    });
  }

  const reasons = [];
  if (!isSalesEnabled()) reasons.push("SALES_CLOSED");
  const cartStatus = String(input.cartStatus || "").toLowerCase();
  const orderStatus = String(input.orderStatus || "").toLowerCase();
  const abandonedAt = Date.parse(String(input.abandonedAt || ""));
  const abandoned = cartStatus === "abandoned" && Number.isFinite(abandonedAt) && Date.now() - abandonedAt >= ABANDONED_MS && !input.orderId && !OPEN_ORDERS.has(orderStatus);
  let code = "CART_NOT_ABANDONED";

  if (input.timeout === true) code = "TIMEOUT";
  else if (input.networkError === true) code = "NETWORK_ERROR";
  else if (input.mock === true || input.synthetic === true || input.source === "mock" || input.source === "DEMO") code = "MOCK_NOT_CART";
  else if (!customerId || !cartId) code = "CART_OWNER_UNKNOWN";
  else if (customerId !== cartCustomerId) code = "CART_OWNER_MISMATCH";
  else if (cartStatus === "deleted") code = "CART_DELETED";
  else if (cartStatus === "cancelled") code = "CART_CANCELLED";
  else if (!abandoned) code = "CART_NOT_ABANDONED";
  else if (!PERMISSION_FIELDS[channel]) code = "CHANNEL_UNKNOWN";
  else {
    const permissions = readMarketingConsent(customerId);
    code = consentCode(permissions[PERMISSION_FIELDS[channel]]);
  }

  reasons.push(code);
  const result = closed(code, statusFor(code), {
    reasons,
    customerId: customerId && customerId === cartCustomerId ? customerId : null,
    cartId: cartId || null,
    channel: PERMISSION_FIELDS[channel] ? channel : null,
  });
  decisions.set(key, result);
  return result;
}

function retryCartRecovery(key) {
  const prior = key ? decisions.get(key) : null;
  if (!prior) return closed("RETRY_UNKNOWN", "UNKNOWN", { attempts: 0 });
  const next = closed(prior.status === "FAILED" ? prior.code : "RETRY_NOT_APPLIED", prior.status === "FAILED" ? "FAILED" : prior.status, {
    ...prior,
    attempts: (prior.attempts || 1) + 1,
    code: prior.status === "FAILED" ? prior.code : "RETRY_NOT_APPLIED",
    recovered: false,
    emailSent: false,
    smsSent: false,
    pushSent: false,
    messageSent: false,
    orderCreated: false,
    paymentCreated: false,
    reservationCreated: false,
    couponAdded: false,
    duplicate: false,
  });
  decisions.set(key, next);
  return next;
}

module.exports = {
  assessCartRecovery,
  retryCartRecovery,
};
