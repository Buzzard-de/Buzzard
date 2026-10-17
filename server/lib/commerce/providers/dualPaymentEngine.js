/**
 * Shared Stripe/PayPal interface on the existing Payment Engine + Order + shipment gate.
 * Not a second payment system. Browser success is never payment proof.
 */

const paymentLifecycle = require("../../software/paymentLifecycle");
const shipmentGate = require("../../software/shipmentGate");
const paymentRisk = require("../../software/paymentRisk");
const { PAYMENT_STATE, PROVIDER_OPERATIONAL_STATUS } = require("../../software/secureCommerceConstants");
const { moneyCents, writeAudit } = require("../../software/secureIds");
const stripeAdapter = require("./stripeAdapter");
const paypalAdapter = require("./paypalAdapter");

const ADAPTERS = Object.freeze({
  stripe: stripeAdapter,
  paypal: paypalAdapter,
});

function getAdapter(provider) {
  return ADAPTERS[String(provider || "").toLowerCase()] || null;
}

function publicPayment(payment) {
  if (!payment) return null;
  return {
    id: payment.id,
    orderId: payment.orderId,
    provider: payment.provider,
    state: payment.state,
    captured: payment.captured === true,
    authorizedOnly: payment.authorizedOnly === true,
    requiresCustomerAction: payment.requiresCustomerAction === true,
    reconciliationRequired: payment.reconciliationRequired === true,
    disputed: payment.disputed === true,
    currency: payment.currency,
    realMoneyMovement: false,
  };
}

function safeResult(extra = {}) {
  return {
    shipmentAuthorized: false,
    realMoneyMovement: false,
    orderCreated: false,
    paymentCreated: extra.paymentCreated === true,
    commercialPaymentCreated: false,
    ...extra,
  };
}

function resolveAmounts(input = {}) {
  const expectedAmount = input.expectedAmount ?? input.serverAmount;
  if (expectedAmount == null) {
    return { ok: false, reason: "SERVER_AMOUNT_REQUIRED" };
  }
  const expectedCurrency = String(input.expectedCurrency || input.serverCurrency || "EUR").toUpperCase();
  const clientAmount = input.clientAmount;
  const clientCurrency = input.clientCurrency;
  if (clientAmount != null && moneyCents(clientAmount) !== moneyCents(expectedAmount)) {
    return { ok: false, reason: "AMOUNT_TAMPERING" };
  }
  if (clientCurrency && String(clientCurrency).toUpperCase() !== expectedCurrency) {
    return { ok: false, reason: "CURRENCY_TAMPERING" };
  }
  if (expectedCurrency !== "EUR") {
    return { ok: false, reason: "CURRENCY_UNSUPPORTED", currency: expectedCurrency };
  }
  return { ok: true, expectedAmount, expectedCurrency, amountCents: moneyCents(expectedAmount) };
}

async function createPayment(db, input = {}, deps = {}) {
  const provider = String(input.provider || "").toLowerCase();
  const adapter = getAdapter(provider);
  if (!adapter) return safeResult({ ok: false, reason: "PROVIDER_UNKNOWN", status: PROVIDER_OPERATIONAL_STATUS.NOT_IMPLEMENTED });

  const amounts = resolveAmounts(input);
  if (!amounts.ok) return safeResult({ ok: false, ...amounts });

  const created = paymentLifecycle.createPayment(db, {
    orderId: input.orderId,
    amount: amounts.expectedAmount,
    currency: amounts.expectedCurrency,
    provider,
    idempotencyKey: input.idempotencyKey,
    captureRequired: true,
  });
  if (!created.ok) return safeResult({ ok: false, ...created });

  const providerCall =
    provider === "stripe"
      ? await adapter.createCheckoutSession({ ...input, expectedAmount: amounts.expectedAmount, expectedCurrency: amounts.expectedCurrency }, deps)
      : await adapter.createOrder({ ...input, expectedAmount: amounts.expectedAmount, expectedCurrency: amounts.expectedCurrency }, deps);

  if (providerCall.reason === "AMOUNT_TAMPERING" || providerCall.reason === "CURRENCY_TAMPERING") {
    return safeResult({ ok: false, ...providerCall });
  }

  if (providerCall.reason === "PROVIDER_TIMEOUT_NOT_SUCCESS") {
    paymentLifecycle.applyState(db, created.payment.id, PAYMENT_STATE.PAYMENT_RECONCILIATION_REQUIRED, "timeout");
    writeAudit(db, "payment.provider_timeout", created.payment.id, { provider });
    return safeResult({
      ok: true,
      success: false,
      payment: publicPayment(paymentLifecycle.getPayment(db, created.payment.id)),
      duplicate: created.duplicate,
      reason: "PROVIDER_TIMEOUT_NOT_SUCCESS",
    });
  }

  if (providerCall.reason === "PROVIDER_UNAVAILABLE") {
    paymentLifecycle.applyState(db, created.payment.id, PAYMENT_STATE.PAYMENT_FAILED, "provider_unavailable");
    return safeResult({ ok: false, payment: publicPayment(paymentLifecycle.getPayment(db, created.payment.id)), reason: "PROVIDER_UNAVAILABLE" });
  }

  let payment = created.payment;
  if (providerCall.providerPaymentId) {
    payment = paymentLifecycle.attachProviderRef(db, created.payment.id, providerCall.providerPaymentId);
  }
  if (providerCall.requiresCustomerAction && payment.state === PAYMENT_STATE.PAYMENT_PENDING) {
    paymentLifecycle.applyState(db, payment.id, PAYMENT_STATE.PAYMENT_REQUIRES_CUSTOMER_ACTION, "provider_create");
    payment = paymentLifecycle.getPayment(db, payment.id);
  }

  writeAudit(db, "payment.provider_create", payment.id, {
    provider,
    mock: Boolean(providerCall.mock),
    reason: providerCall.reason || null,
  });

  return safeResult({
    ok: true,
    duplicate: created.duplicate,
    payment: publicPayment(payment),
    paymentCreated: created.duplicate !== true,
    checkoutUrl: providerCall.checkoutUrl || null,
    approvalUrl: providerCall.approvalUrl || null,
    providerPaymentId: providerCall.providerPaymentId || payment.providerPaymentId,
    status: providerCall.status || adapter.operationalStatus({ mockTestsPassed: Boolean(deps.client) }).status,
    reason: providerCall.reason || null,
    clientStatusIgnored: true,
  });
}

function retrievePayment(db, paymentId) {
  const payment = paymentLifecycle.getPayment(db, paymentId);
  if (!payment) return safeResult({ ok: false, reason: "PAYMENT_NOT_FOUND" });
  return safeResult({
    ok: true,
    payment: publicPayment(payment),
    captured: payment.captured === true,
  });
}

async function retrieveProviderPayment(db, paymentId, deps = {}) {
  const payment = paymentLifecycle.getPayment(db, paymentId);
  if (!payment) return safeResult({ ok: false, reason: "PAYMENT_NOT_FOUND" });
  const adapter = getAdapter(payment.provider);
  if (!adapter) return safeResult({ ok: false, reason: "PROVIDER_UNKNOWN" });
  const remote = await adapter.retrievePayment(payment.providerPaymentId, deps);
  if (remote.reason === "PROVIDER_TIMEOUT_NOT_SUCCESS") {
    paymentLifecycle.applyState(db, payment.id, PAYMENT_STATE.PAYMENT_RECONCILIATION_REQUIRED, "timeout");
    return safeResult({ ok: true, success: false, reason: "PROVIDER_TIMEOUT_NOT_SUCCESS", payment: publicPayment(paymentLifecycle.getPayment(db, payment.id)) });
  }
  return safeResult({ ok: remote.ok, payment: publicPayment(payment), remote: remote.ok ? { status: remote.remote?.status, captured: remote.captured === true } : null, reason: remote.reason || null });
}

function recordFailure(db, paymentId, reason = "provider_failure") {
  const payment = paymentLifecycle.getPayment(db, paymentId);
  if (!payment) return safeResult({ ok: false, reason: "PAYMENT_NOT_FOUND" });
  const applied = paymentLifecycle.applyState(db, paymentId, PAYMENT_STATE.PAYMENT_FAILED, reason);
  return safeResult({ ok: applied.ok, payment: publicPayment(applied.payment || payment), reason: applied.reason || reason });
}

function recordRefundStatus(db, paymentId, input = {}) {
  const payment = paymentLifecycle.getPayment(db, paymentId);
  if (!payment) return safeResult({ ok: false, reason: "PAYMENT_NOT_FOUND" });
  const adapter = getAdapter(payment.provider);
  const recorded = adapter ? adapter.recordRefundStatus(input) : { ok: false, reason: "NOT_IMPLEMENTED" };
  const target = input.partial === true ? PAYMENT_STATE.PAYMENT_PARTIALLY_REFUNDED : PAYMENT_STATE.PAYMENT_REFUNDED;
  if (payment.state === PAYMENT_STATE.PAYMENT_CAPTURED || payment.state === PAYMENT_STATE.PAYMENT_REFUND_PENDING || payment.state === PAYMENT_STATE.PAYMENT_PARTIALLY_REFUNDED) {
    paymentLifecycle.applyState(db, paymentId, target, "refund_record_only");
  }
  writeAudit(db, "payment.refund_record", paymentId, { executed: false, kind: "customer_refund" });
  return safeResult({
    ok: true,
    executed: false,
    realRefund: false,
    payment: publicPayment(paymentLifecycle.getPayment(db, paymentId)),
    distinctFromChargeback: true,
    distinctFromSupplierCredit: true,
    reason: recorded.reason || "REFUND_RECORD_ONLY",
  });
}

function recordDisputeStatus(db, paymentId, input = {}) {
  const payment = paymentLifecycle.getPayment(db, paymentId);
  if (!payment) return safeResult({ ok: false, reason: "PAYMENT_NOT_FOUND" });
  const adapter = getAdapter(payment.provider);
  if (adapter) adapter.recordDisputeStatus(input);
  const target = input.chargeback === true ? PAYMENT_STATE.CHARGEBACK : PAYMENT_STATE.PAYMENT_DISPUTED;
  paymentLifecycle.applyState(db, paymentId, target, input.chargeback ? "chargeback_record" : "dispute_record");
  writeAudit(db, "payment.dispute_record", paymentId, { chargeback: input.chargeback === true, executed: false });
  return safeResult({
    ok: true,
    executed: false,
    payment: publicPayment(paymentLifecycle.getPayment(db, paymentId)),
    distinctFromRefund: true,
    distinctFromSupplierCredit: true,
  });
}

async function reconcilePayment(db, paymentId, deps = {}) {
  const payment = paymentLifecycle.getPayment(db, paymentId);
  if (!payment) return safeResult({ ok: false, reason: "PAYMENT_NOT_FOUND" });
  const adapter = getAdapter(payment.provider);
  if (!adapter) return safeResult({ ok: false, reason: "PROVIDER_UNKNOWN" });

  if (!deps.client) {
    return safeResult({
      ok: true,
      executed: false,
      financialEffect: false,
      status: PROVIDER_OPERATIONAL_STATUS.NOT_CONFIGURED,
      reason: "RECONCILE_READ_ONLY_NO_PROVIDER",
      payment: publicPayment(payment),
    });
  }

  const remote = await adapter.retrievePayment(payment.providerPaymentId, deps);
  if (remote.reason === "PROVIDER_TIMEOUT_NOT_SUCCESS" || remote.reason === "PROVIDER_UNAVAILABLE") {
    paymentLifecycle.applyState(db, payment.id, PAYMENT_STATE.PAYMENT_RECONCILIATION_REQUIRED, remote.reason);
    return safeResult({
      ok: true,
      success: false,
      executed: false,
      mismatch: true,
      reason: remote.reason,
      payment: publicPayment(paymentLifecycle.getPayment(db, payment.id)),
    });
  }

  const remoteAmount = remote.remote?.amountCents ?? remote.remote?.amount ?? null;
  const remoteCurrency = remote.remote?.currency ? String(remote.remote.currency).toUpperCase() : payment.currency;
  const amountMatch = remoteAmount == null || Number(remoteAmount) === payment.amountCents;
  const currencyMatch = remoteCurrency === payment.currency;
  const capturedRemote = remote.captured === true || remote.remote?.status === "succeeded" || remote.remote?.status === "COMPLETED";
  const mismatch = !amountMatch || !currencyMatch || (payment.captured !== capturedRemote);

  if (mismatch) {
    paymentLifecycle.applyState(db, payment.id, PAYMENT_STATE.PAYMENT_RECONCILIATION_REQUIRED, "provider_mismatch");
  }

  writeAudit(db, "payment.reconcile", payment.id, {
    mismatch,
    executed: false,
    financialEffect: false,
  });

  return safeResult({
    ok: true,
    executed: false,
    financialEffect: false,
    captured: false,
    refundIssued: false,
    transferIssued: false,
    shipmentReleased: false,
    salesUnlocked: false,
    mismatch,
    diagnostic: mismatch ? "Internal payment and provider status disagree. Order stays blocked." : "Read-only compare matched.",
    payment: publicPayment(paymentLifecycle.getPayment(db, payment.id)),
  });
}

function findPayment(db, { paymentId, provider, providerPaymentId, orderId }) {
  if (paymentId) return paymentLifecycle.getPayment(db, paymentId);
  if (provider && providerPaymentId) return paymentLifecycle.getPaymentByProviderRef(db, provider, providerPaymentId);
  if (orderId && provider) {
    const row = db.prepare("SELECT * FROM software_payments WHERE order_id = ? AND provider = ? ORDER BY created_at DESC").get(orderId, provider);
    return row ? paymentLifecycle.getPayment(db, row.id) : null;
  }
  return null;
}

async function handleWebhook(db, input = {}, deps = {}) {
  const provider = String(input.provider || "").toLowerCase();
  const adapter = getAdapter(provider);
  if (!adapter) {
    return safeResult({ ok: false, accepted: false, status: 400, reason: "PROVIDER_UNKNOWN" });
  }

  const verified = await adapter.verifyWebhook({
    rawBody: input.rawBody,
    headers: input.headers,
    signature: input.signature,
    secret: input.secret,
    verifyFn: deps.verifyFn || input.verifyFn,
    nowSeconds: input.nowSeconds,
    toleranceSeconds: input.toleranceSeconds,
    webhookId: input.webhookId,
  });
  if (!verified.ok) {
    writeAudit(db, "payment.webhook_rejected", provider, { reason: verified.reason });
    paymentRisk.assess({
      providerStatus: "UNKNOWN",
      webhookVerificationFailed: true,
      amount: input.expectedAmount,
      currency: input.expectedCurrency || "EUR",
    });
    return safeResult({
      ok: false,
      accepted: false,
      status: verified.reason === "NOT_CONFIGURED" ? 503 : 401,
      reason: verified.reason,
    });
  }

  const event = adapter.parseEvent(input.rawBody);
  if (!event) {
    return safeResult({ ok: false, accepted: false, status: 400, reason: "WEBHOOK_PAYLOAD_INVALID" });
  }

  const eventId = String(event.id || input.eventId || "").trim();
  const normalized = adapter.normalizeProviderStatus(event);
  const metadataOrderId = event.data?.object?.metadata?.orderId || event.resource?.reference_id || event.resource?.invoice_id;
  const payment = findPayment(db, {
    paymentId: input.paymentId,
    provider,
    providerPaymentId: normalized.providerPaymentId || input.providerPaymentId,
    orderId: input.orderId || metadataOrderId,
  });

  if (!payment) {
    return safeResult({
      ok: false,
      accepted: true,
      applied: false,
      status: 202,
      reason: "PAYMENT_NOT_FOUND",
    });
  }

  if (normalized.providerPaymentId && !payment.providerPaymentId) {
    paymentLifecycle.attachProviderRef(db, payment.id, normalized.providerPaymentId);
  }

  if (normalized.needsRetrieve && deps.client) {
    const remote = await adapter.retrievePayment(payment.providerPaymentId || normalized.providerPaymentId, deps);
    if (remote.reason === "PROVIDER_TIMEOUT_NOT_SUCCESS") {
      return paymentLifecycle.ingestVerifiedEvent(db, {
        paymentId: payment.id,
        eventId: eventId || `timeout-${Date.now()}`,
        timeout: true,
      });
    }
    if (remote.captured === true) {
      normalized.targetState = PAYMENT_STATE.PAYMENT_CAPTURED;
      normalized.captured = true;
    }
  }

  const amount = normalized.amountCents != null ? normalized.amountCents / 100 : payment.amountCents / 100;
  const ingested = paymentLifecycle.ingestVerifiedEvent(db, {
    paymentId: payment.id,
    eventId,
    eventType: event.type || event.event_type,
    targetState: normalized.targetState,
    amount,
    currency: normalized.currency || payment.currency,
  });

  const next = paymentLifecycle.getPayment(db, payment.id);
  let inventoryCommit = null;
  if (ingested.applied === true && next.captured === true) {
    const orderInventoryBridge = require("../../software/orderInventoryBridge");
    inventoryCommit = orderInventoryBridge.commitOnCapturedPayment(db, {
      orderId: next.orderId,
      payment: next,
      official: true,
    });
  }
  const gate = shipmentGate.evaluate(db, {
    orderId: next.orderId,
    paymentId: next.id,
    expectedAmount: next.amountCents / 100,
    expectedCurrency: next.currency,
    confirmationRequired: false,
    unverifiedWebhook: false,
    riskInput: {
      amount: next.amountCents / 100,
      currency: next.currency,
      expectedAmount: next.amountCents / 100,
      expectedCurrency: next.currency,
      providerStatus: ingested.ok ? "ok" : "UNKNOWN",
    },
  });

  return safeResult({
    ok: ingested.ok,
    accepted: ingested.accepted !== false,
    applied: ingested.applied === true,
    duplicate: ingested.duplicate === true,
    status: 200,
    reason: ingested.reason || null,
    payment: publicPayment(next),
    captured: next.captured === true,
    shipmentAuthorized: false,
    shipmentGateBlocked: gate.blocked,
    shipmentReasons: gate.reasons,
    inventoryCommit,
  });
}

function clientCannotMarkPaid(clientStatus) {
  return paymentLifecycle.clientStatusIsNotProof(clientStatus);
}

function evaluateShipment(db, input = {}) {
  return shipmentGate.evaluate(db, {
    ...input,
    browserRedirectSuccess: input.browserRedirectSuccess === true,
    frontendSuccess: input.frontendSuccess === true,
    unverifiedWebhook: input.unverifiedWebhook === true,
    providerTimeout: input.providerTimeout === true,
  });
}

function providerDiagnostics({ mockTestsPassed = false } = {}) {
  const flags = require("../../commerce/commerceFeatureFlags").getEffectiveFlags();
  return {
    stripe: stripeAdapter.operationalStatus({ mockTestsPassed }),
    paypal: paypalAdapter.operationalStatus({ mockTestsPassed }),
    salesEnabled: flags.salesEnabled,
    livePayments: flags.livePaymentsEnabled,
    productSotActive: flags.productSotActive,
    productSotEnvFlag: flags.productSotEnvFlag,
    realMoneyMovement: false,
    sandboxVerified: false,
    liveVerified: false,
  };
}

module.exports = {
  createPayment,
  retrievePayment,
  retrieveProviderPayment,
  verifyWebhook: async (provider, args, deps) => {
    const adapter = getAdapter(provider);
    if (!adapter) return { ok: false, reason: "NOT_IMPLEMENTED" };
    return adapter.verifyWebhook(args, deps);
  },
  normalizeProviderStatus: (provider, event) => {
    const adapter = getAdapter(provider);
    if (!adapter) return { status: PROVIDER_OPERATIONAL_STATUS.NOT_IMPLEMENTED };
    return adapter.normalizeProviderStatus(event);
  },
  reconcilePayment,
  recordRefundStatus,
  recordDisputeStatus,
  recordFailure,
  handleWebhook,
  clientCannotMarkPaid,
  evaluateShipment,
  providerDiagnostics,
  getAdapter,
};
