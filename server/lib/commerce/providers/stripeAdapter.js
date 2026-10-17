/**
 * Stripe adapter for the existing Buzzard Payment Engine.
 * Official Checkout Session + webhook signature algorithm (no stripe npm).
 * Live HTTP never runs unless sales are enabled AND BUZZARD_LIVE_PAYMENTS=1.
 */

const crypto = require("crypto");
const { PAYMENT_STATE, PROVIDER_OPERATIONAL_STATUS } = require("../../software/secureCommerceConstants");
const { moneyCents, timingEqualHex } = require("../../software/secureIds");

const PROVIDER = "stripe";
const SIGNATURE_TOLERANCE_SECONDS = 300;

function liveFinancialActionsAllowed() {
  return process.env.BUZZARD_SALES_ENABLED === "1" && process.env.BUZZARD_LIVE_PAYMENTS === "1";
}

function credentialsPresent() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

function webhookSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET || "";
}

function operationalStatus({ mockTestsPassed = false } = {}) {
  const blocked = !liveFinancialActionsAllowed();
  const secret = process.env.STRIPE_SECRET_KEY || "";
  const looksLive = secret.startsWith("sk_live");
  const looksTest = secret.startsWith("sk_test") || Boolean(secret && !looksLive);
  const webhookReady = Boolean(process.env.STRIPE_WEBHOOK_SECRET);

  let status = PROVIDER_OPERATIONAL_STATUS.IMPLEMENTED;
  if (!secret) status = mockTestsPassed ? PROVIDER_OPERATIONAL_STATUS.TESTED_WITH_MOCKS : PROVIDER_OPERATIONAL_STATUS.NOT_CONFIGURED;
  else if (looksLive) status = PROVIDER_OPERATIONAL_STATUS.LIVE_CONFIGURED;
  else if (looksTest && webhookReady) status = PROVIDER_OPERATIONAL_STATUS.SANDBOX_CONFIGURED;
  else if (looksTest) status = PROVIDER_OPERATIONAL_STATUS.SANDBOX_CONFIGURED;
  if (blocked && status !== PROVIDER_OPERATIONAL_STATUS.NOT_CONFIGURED && !mockTestsPassed) {
    status = credentialsPresent() ? PROVIDER_OPERATIONAL_STATUS.BLOCKED : status;
  }
  if (mockTestsPassed && !credentialsPresent()) status = PROVIDER_OPERATIONAL_STATUS.TESTED_WITH_MOCKS;

  return {
    provider: PROVIDER,
    codeImplemented: true,
    status,
    sandboxConfigured: looksTest && !looksLive,
    sandboxVerified: false,
    liveConfigured: looksLive,
    liveVerified: false,
    blocked,
    notConfigured: !secret,
    webhookSecretConfigured: webhookReady,
    realMoneyMovement: false,
    reason: blocked
      ? liveFinancialActionsAllowed()
        ? null
        : "LIVE_HTTP_BLOCKED"
      : secret
        ? null
        : "NOT_CONFIGURED",
  };
}

function header(headers, name) {
  const wanted = String(name).toLowerCase();
  for (const [key, value] of Object.entries(headers || {})) {
    if (String(key).toLowerCase() === wanted) return value;
  }
  return undefined;
}

function parseStripeSignature(signatureHeader) {
  const timestamp = { value: "" };
  const v1 = [];
  for (const part of String(signatureHeader || "").split(",")) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq);
    const value = trimmed.slice(eq + 1);
    if (key === "t") timestamp.value = value;
    if (key === "v1") v1.push(value);
  }
  return { timestamp: timestamp.value, v1 };
}

function verifyWebhook({ rawBody, headers = {}, signature, secret, nowSeconds, toleranceSeconds } = {}) {
  const webhookSigningSecret = secret || webhookSecret();
  if (!webhookSigningSecret) {
    return {
      ok: false,
      accepted: false,
      reason: "NOT_CONFIGURED",
      status: PROVIDER_OPERATIONAL_STATUS.NOT_CONFIGURED,
      shipmentAuthorized: false,
    };
  }

  const headerValue = signature || header(headers, "stripe-signature") || "";
  if (!headerValue) {
    return { ok: false, accepted: false, reason: "WEBHOOK_SIGNATURE_MISSING", shipmentAuthorized: false };
  }

  const parsed = parseStripeSignature(headerValue);
  if (!parsed.timestamp || !parsed.v1.length) {
    return { ok: false, accepted: false, reason: "WEBHOOK_SIGNATURE_INVALID", shipmentAuthorized: false };
  }

  const tolerance = toleranceSeconds == null ? SIGNATURE_TOLERANCE_SECONDS : Number(toleranceSeconds);
  const now = nowSeconds == null ? Math.floor(Date.now() / 1000) : Number(nowSeconds);
  if (Number.isFinite(tolerance) && Math.abs(now - Number(parsed.timestamp)) > tolerance) {
    return { ok: false, accepted: false, reason: "WEBHOOK_REPLAY_OR_STALE", shipmentAuthorized: false };
  }

  const payload = `${parsed.timestamp}.${String(rawBody || "")}`;
  const expected = crypto.createHmac("sha256", webhookSigningSecret).update(payload, "utf8").digest("hex");
  const matched = parsed.v1.some((candidate) => timingEqualHex(expected, candidate));
  if (!matched) {
    return { ok: false, accepted: false, reason: "WEBHOOK_SIGNATURE_INVALID", shipmentAuthorized: false };
  }

  return {
    ok: true,
    accepted: true,
    reason: "WEBHOOK_SIGNATURE_OK",
    timestamp: parsed.timestamp,
    officialAlgorithm: "stripe-signature-t-v1-hmac-sha256",
  };
}

function parseEvent(rawBody) {
  try {
    return JSON.parse(String(rawBody || "{}"));
  } catch {
    return null;
  }
}

function extractAmountCurrency(object = {}) {
  const currency = String(object.currency || object.currency_code || "eur").toUpperCase();
  if (object.amount_total != null) return { amountCents: Number(object.amount_total), currency };
  if (object.amount_received != null) return { amountCents: Number(object.amount_received), currency };
  if (object.amount != null && Number.isInteger(Number(object.amount))) {
    return { amountCents: Number(object.amount), currency };
  }
  return { amountCents: moneyCents(object.amount), currency };
}

function normalizeProviderStatus(event = {}) {
  const type = event.type || event.event_type || "";
  const object = event.data?.object || event.resource || {};
  const money = extractAmountCurrency(object);
  const providerPaymentId =
    object.payment_intent ||
    object.id ||
    object.session_id ||
    null;

  switch (type) {
    case "checkout.session.created":
      return {
        targetState: PAYMENT_STATE.PAYMENT_REQUIRES_CUSTOMER_ACTION,
        captured: false,
        providerPaymentId,
        ...money,
        note: "Checkout created is not capture.",
      };
    case "checkout.session.expired":
      return { targetState: PAYMENT_STATE.PAYMENT_CANCELLED, captured: false, providerPaymentId, ...money };
    case "checkout.session.completed":
      return {
        targetState: PAYMENT_STATE.PAYMENT_CAPTURE_PENDING,
        captured: false,
        needsRetrieve: true,
        providerPaymentId: object.payment_intent || providerPaymentId,
        ...money,
        note: "Browser/checkout completion is not authoritative capture.",
      };
    case "payment_intent.processing":
      return { targetState: PAYMENT_STATE.PAYMENT_CAPTURE_PENDING, captured: false, providerPaymentId, ...money };
    case "payment_intent.amount_capturable_updated":
      return { targetState: PAYMENT_STATE.PAYMENT_AUTHORIZED, captured: false, providerPaymentId, ...money };
    case "payment_intent.succeeded":
      if (object.status === "requires_capture") {
        return { targetState: PAYMENT_STATE.PAYMENT_AUTHORIZED, captured: false, providerPaymentId, ...money };
      }
      return { targetState: PAYMENT_STATE.PAYMENT_CAPTURED, captured: true, providerPaymentId, ...money };
    case "payment_intent.payment_failed":
      return { targetState: PAYMENT_STATE.PAYMENT_FAILED, captured: false, providerPaymentId, ...money };
    case "payment_intent.canceled":
      return { targetState: PAYMENT_STATE.PAYMENT_CANCELLED, captured: false, providerPaymentId, ...money };
    case "charge.refunded": {
      const refunded = Number(object.amount_refunded || 0);
      const total = Number(object.amount || 0);
      if (refunded > 0 && total > 0 && refunded < total) {
        return { targetState: PAYMENT_STATE.PAYMENT_PARTIALLY_REFUNDED, captured: false, providerPaymentId, ...money };
      }
      return { targetState: PAYMENT_STATE.PAYMENT_REFUNDED, captured: false, providerPaymentId, ...money };
    }
    case "charge.dispute.created":
      return { targetState: PAYMENT_STATE.PAYMENT_DISPUTED, captured: false, providerPaymentId, ...money };
    case "charge.dispute.closed":
      if (object.status === "lost") {
        return { targetState: PAYMENT_STATE.CHARGEBACK, captured: false, providerPaymentId, ...money };
      }
      return { targetState: PAYMENT_STATE.PAYMENT_RECONCILIATION_REQUIRED, captured: false, providerPaymentId, ...money };
    default:
      return {
        targetState: PAYMENT_STATE.PAYMENT_RECONCILIATION_REQUIRED,
        captured: false,
        unknownEvent: true,
        providerPaymentId,
        ...money,
      };
  }
}

async function createCheckoutSession(input = {}, deps = {}) {
  if (input.clientAmount != null && input.expectedAmount != null) {
    if (moneyCents(input.clientAmount) !== moneyCents(input.expectedAmount)) {
      return { ok: false, reason: "AMOUNT_TAMPERING", shipmentAuthorized: false, realMoneyMovement: false };
    }
  }
  if (input.clientCurrency && String(input.clientCurrency).toUpperCase() !== String(input.expectedCurrency || input.currency || "EUR").toUpperCase()) {
    return { ok: false, reason: "CURRENCY_TAMPERING", shipmentAuthorized: false, realMoneyMovement: false };
  }

  if (!deps.client) {
    const status = operationalStatus();
    return {
      ok: true,
      executed: false,
      checkoutUrl: null,
      realMoneyMovement: false,
      shipmentAuthorized: false,
      status: status.notConfigured ? PROVIDER_OPERATIONAL_STATUS.NOT_CONFIGURED : PROVIDER_OPERATIONAL_STATUS.BLOCKED,
      reason: status.notConfigured ? "NOT_CONFIGURED" : "LIVE_HTTP_BLOCKED",
    };
  }

  try {
    const session = await deps.client.createCheckoutSession({
      orderId: input.orderId,
      amountCents: moneyCents(input.expectedAmount ?? input.amount),
      currency: String(input.expectedCurrency || input.currency || "EUR").toUpperCase(),
      idempotencyKey: input.idempotencyKey,
    });
    return {
      ok: true,
      executed: false,
      mock: true,
      realMoneyMovement: false,
      checkoutUrl: session.url || null,
      providerPaymentId: session.payment_intent || session.id,
      providerSessionId: session.id,
      requiresCustomerAction: true,
    };
  } catch (err) {
    if (err && err.code === "TIMEOUT") {
      return {
        ok: true,
        success: false,
        executed: false,
        shipmentAuthorized: false,
        realMoneyMovement: false,
        reason: "PROVIDER_TIMEOUT_NOT_SUCCESS",
      };
    }
    return {
      ok: false,
      executed: false,
      shipmentAuthorized: false,
      realMoneyMovement: false,
      reason: err && err.code === "UNAVAILABLE" ? "PROVIDER_UNAVAILABLE" : "PROVIDER_ERROR",
    };
  }
}

async function retrievePayment(providerPaymentId, deps = {}) {
  if (!deps.client) {
    return { ok: false, reason: "NOT_CONFIGURED", authoritative: false, shipmentAuthorized: false };
  }
  try {
    const remote = await deps.client.retrievePayment(providerPaymentId);
    return { ok: true, authoritative: true, live: false, remote, realMoneyMovement: false };
  } catch (err) {
    if (err && err.code === "TIMEOUT") {
      return { ok: true, success: false, authoritative: false, reason: "PROVIDER_TIMEOUT_NOT_SUCCESS" };
    }
    return { ok: false, reason: "PROVIDER_UNAVAILABLE", authoritative: false };
  }
}

function recordRefundStatus() {
  return { ok: true, executed: false, realRefund: false, reason: "REFUND_RECORD_ONLY" };
}

function recordDisputeStatus() {
  return { ok: true, executed: false, realChargebackAction: false, reason: "DISPUTE_RECORD_ONLY" };
}

function capture() {
  return { ok: false, executed: false, status: PROVIDER_OPERATIONAL_STATUS.NOT_IMPLEMENTED, reason: "NOT_IMPLEMENTED" };
}

function refund() {
  return { ok: false, executed: false, status: PROVIDER_OPERATIONAL_STATUS.NOT_IMPLEMENTED, reason: "NOT_IMPLEMENTED" };
}

module.exports = {
  PROVIDER,
  operationalStatus,
  verifyWebhook,
  parseEvent,
  normalizeProviderStatus,
  createCheckoutSession,
  retrievePayment,
  recordRefundStatus,
  recordDisputeStatus,
  capture,
  refund,
  liveFinancialActionsAllowed,
};
