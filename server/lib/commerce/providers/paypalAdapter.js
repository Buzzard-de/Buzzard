/**
 * PayPal adapter for the existing Buzzard Payment Engine.
 * Official Orders + webhook verification API. Live HTTP is blocked by default.
 * Approval redirect is never treated as capture.
 */

const { PAYMENT_STATE, PROVIDER_OPERATIONAL_STATUS } = require("../../software/secureCommerceConstants");
const { moneyCents } = require("../../software/secureIds");

const PROVIDER = "paypal";

function liveFinancialActionsAllowed() {
  return process.env.BUZZARD_SALES_ENABLED === "1" && process.env.BUZZARD_LIVE_PAYMENTS === "1";
}

function credentialsPresent() {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

function webhookIdPresent() {
  return Boolean(process.env.PAYPAL_WEBHOOK_ID);
}

function operationalStatus({ mockTestsPassed = false } = {}) {
  const blocked = !liveFinancialActionsAllowed();
  const env = String(process.env.PAYPAL_ENV || "sandbox").toLowerCase();
  const liveEnv = env === "live" || env === "production";
  let status = PROVIDER_OPERATIONAL_STATUS.IMPLEMENTED;
  if (!credentialsPresent()) {
    status = mockTestsPassed ? PROVIDER_OPERATIONAL_STATUS.TESTED_WITH_MOCKS : PROVIDER_OPERATIONAL_STATUS.NOT_CONFIGURED;
  } else if (liveEnv) {
    status = PROVIDER_OPERATIONAL_STATUS.LIVE_CONFIGURED;
  } else {
    status = PROVIDER_OPERATIONAL_STATUS.SANDBOX_CONFIGURED;
  }
  if (blocked && credentialsPresent() && !mockTestsPassed) status = PROVIDER_OPERATIONAL_STATUS.BLOCKED;
  if (mockTestsPassed && !credentialsPresent()) status = PROVIDER_OPERATIONAL_STATUS.TESTED_WITH_MOCKS;

  return {
    provider: PROVIDER,
    codeImplemented: true,
    status,
    sandboxConfigured: credentialsPresent() && !liveEnv,
    sandboxVerified: false,
    liveConfigured: credentialsPresent() && liveEnv,
    liveVerified: false,
    blocked,
    notConfigured: !credentialsPresent(),
    webhookIdConfigured: webhookIdPresent(),
    paypalEnv: liveEnv ? "live" : "sandbox",
    autoSwitchToLive: false,
    realMoneyMovement: false,
    reason: blocked ? "LIVE_HTTP_BLOCKED" : credentialsPresent() ? null : "NOT_CONFIGURED",
  };
}

function header(headers, name) {
  const wanted = String(name).toLowerCase();
  for (const [key, value] of Object.entries(headers || {})) {
    if (String(key).toLowerCase() === wanted) return value;
  }
  return undefined;
}

function requiredTransmissionHeaders(headers = {}) {
  return {
    auth_algo: header(headers, "paypal-auth-algo"),
    cert_url: header(headers, "paypal-cert-url"),
    transmission_id: header(headers, "paypal-transmission-id"),
    transmission_sig: header(headers, "paypal-transmission-sig"),
    transmission_time: header(headers, "paypal-transmission-time"),
  };
}

async function verifyWebhook({ rawBody, headers = {}, webhookId, verifyFn } = {}) {
  const transmission = requiredTransmissionHeaders(headers);
  const missing = Object.entries(transmission)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (missing.length) {
    return {
      ok: false,
      accepted: false,
      reason: "WEBHOOK_SIGNATURE_MISSING",
      missing,
      shipmentAuthorized: false,
    };
  }

  if (typeof verifyFn === "function") {
    const verdict = await verifyFn({
      rawBody,
      headers,
      webhookId: webhookId || process.env.PAYPAL_WEBHOOK_ID,
      transmission,
    });
    if (verdict && verdict.verification_status === "SUCCESS") {
      return { ok: true, accepted: true, reason: "WEBHOOK_SIGNATURE_OK", officialAlgorithm: "paypal-verify-webhook-signature" };
    }
    return { ok: false, accepted: false, reason: "WEBHOOK_SIGNATURE_INVALID", shipmentAuthorized: false };
  }

  if (!credentialsPresent() || !webhookIdPresent()) {
    return {
      ok: false,
      accepted: false,
      reason: "NOT_CONFIGURED",
      status: PROVIDER_OPERATIONAL_STATUS.NOT_CONFIGURED,
      shipmentAuthorized: false,
    };
  }

  if (!liveFinancialActionsAllowed()) {
    return {
      ok: false,
      accepted: false,
      reason: "LIVE_VERIFY_BLOCKED",
      status: PROVIDER_OPERATIONAL_STATUS.BLOCKED,
      shipmentAuthorized: false,
      note: "PayPal official verify is a live API call and stays blocked without sales + BUZZARD_LIVE_PAYMENTS.",
    };
  }

  return {
    ok: false,
    accepted: false,
    reason: "NOT_IMPLEMENTED",
    status: PROVIDER_OPERATIONAL_STATUS.NOT_IMPLEMENTED,
    shipmentAuthorized: false,
    note: "Live PayPal verify-webhook-signature is not executed in this slice.",
  };
}

function parseEvent(rawBody) {
  try {
    return JSON.parse(String(rawBody || "{}"));
  } catch {
    return null;
  }
}

function extractAmountCurrency(resource = {}) {
  const amount =
    resource.amount?.value ||
    resource.purchase_units?.[0]?.amount?.value ||
    resource.seller_receivable_breakdown?.gross_amount?.value;
  const currency =
    resource.amount?.currency_code ||
    resource.purchase_units?.[0]?.amount?.currency_code ||
    resource.seller_receivable_breakdown?.gross_amount?.currency_code ||
    "EUR";
  return { amountCents: moneyCents(amount), currency: String(currency).toUpperCase() };
}

function normalizeProviderStatus(event = {}) {
  const type = event.event_type || event.type || "";
  const resource = event.resource || event.data?.object || {};
  const money = extractAmountCurrency(resource);
  const providerPaymentId = resource.id || resource.supplementary_data?.related_ids?.order_id || null;
  const captures = resource.purchase_units?.[0]?.payments?.captures || resource.captures || [];
  const completedCapture = captures.some((item) => String(item.status || "").toUpperCase() === "COMPLETED");

  switch (type) {
    case "CHECKOUT.ORDER.CREATED":
      return { targetState: PAYMENT_STATE.PAYMENT_PENDING, captured: false, providerPaymentId, ...money };
    case "CHECKOUT.ORDER.APPROVED":
      return {
        targetState: PAYMENT_STATE.PAYMENT_AUTHORIZED,
        captured: false,
        providerPaymentId,
        ...money,
        note: "Approval is not capture.",
      };
    case "PAYMENT.CAPTURE.PENDING":
      return { targetState: PAYMENT_STATE.PAYMENT_CAPTURE_PENDING, captured: false, providerPaymentId, ...money };
    case "PAYMENT.CAPTURE.COMPLETED":
      return { targetState: PAYMENT_STATE.PAYMENT_CAPTURED, captured: true, providerPaymentId, ...money };
    case "CHECKOUT.ORDER.COMPLETED":
      return completedCapture
        ? { targetState: PAYMENT_STATE.PAYMENT_CAPTURED, captured: true, providerPaymentId, ...money }
        : {
            targetState: PAYMENT_STATE.PAYMENT_CAPTURE_PENDING,
            captured: false,
            needsRetrieve: true,
            providerPaymentId,
            ...money,
            note: "Order completed event without capture object is not settlement.",
          };
    case "PAYMENT.CAPTURE.DENIED":
    case "PAYMENT.CAPTURE.DECLINED":
      return { targetState: PAYMENT_STATE.PAYMENT_FAILED, captured: false, providerPaymentId, ...money };
    case "CHECKOUT.ORDER.VOIDED":
    case "CHECKOUT.ORDER.CANCELLED":
      return { targetState: PAYMENT_STATE.PAYMENT_CANCELLED, captured: false, providerPaymentId, ...money };
    case "PAYMENT.CAPTURE.REFUNDED":
    case "PAYMENT.CAPTURE.REFUND.COMPLETED":
      return { targetState: PAYMENT_STATE.PAYMENT_REFUNDED, captured: false, providerPaymentId, ...money };
    case "PAYMENT.CAPTURE.REVERSED":
    case "CUSTOMER.DISPUTE.CREATED":
      return { targetState: PAYMENT_STATE.PAYMENT_DISPUTED, captured: false, providerPaymentId, ...money };
    case "CUSTOMER.DISPUTE.RESOLVED":
      if (String(resource.dispute_outcome?.outcome_code || "").toUpperCase().includes("LOST")) {
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

async function createOrder(input = {}, deps = {}) {
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
      approvalUrl: null,
      realMoneyMovement: false,
      shipmentAuthorized: false,
      status: status.notConfigured ? PROVIDER_OPERATIONAL_STATUS.NOT_CONFIGURED : PROVIDER_OPERATIONAL_STATUS.BLOCKED,
      reason: status.notConfigured ? "NOT_CONFIGURED" : "LIVE_HTTP_BLOCKED",
    };
  }

  try {
    const order = await deps.client.createOrder({
      orderId: input.orderId,
      amountCents: moneyCents(input.expectedAmount ?? input.amount),
      currency: String(input.expectedCurrency || input.currency || "EUR").toUpperCase(),
      idempotencyKey: input.idempotencyKey,
    });
    const approvalUrl = (order.links || []).find((link) => link.rel === "approve")?.href || order.approvalUrl || null;
    return {
      ok: true,
      executed: false,
      mock: true,
      realMoneyMovement: false,
      approvalUrl,
      providerPaymentId: order.id,
      paypalStatus: order.status || "CREATED",
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
    const remote = await deps.client.retrieveOrder(providerPaymentId);
    const captures = remote.purchase_units?.[0]?.payments?.captures || [];
    const captured = remote.status === "COMPLETED" && captures.some((item) => item.status === "COMPLETED");
    return {
      ok: true,
      authoritative: true,
      live: false,
      remote,
      captured,
      approvedOnly: remote.status === "APPROVED" && !captured,
      realMoneyMovement: false,
    };
  } catch (err) {
    if (err && err.code === "TIMEOUT") {
      return { ok: true, success: false, authoritative: false, reason: "PROVIDER_TIMEOUT_NOT_SUCCESS" };
    }
    return { ok: false, reason: "PROVIDER_UNAVAILABLE", authoritative: false };
  }
}

function captureOrder() {
  return { ok: false, executed: false, status: PROVIDER_OPERATIONAL_STATUS.NOT_IMPLEMENTED, reason: "NOT_IMPLEMENTED" };
}

function recordRefundStatus() {
  return { ok: true, executed: false, realRefund: false, reason: "REFUND_RECORD_ONLY" };
}

function recordDisputeStatus() {
  return { ok: true, executed: false, realChargebackAction: false, reason: "DISPUTE_RECORD_ONLY" };
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
  createOrder,
  retrievePayment,
  captureOrder,
  recordRefundStatus,
  recordDisputeStatus,
  refund,
  liveFinancialActionsAllowed,
};
