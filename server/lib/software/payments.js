/**
 * Safe payment/refund interpretation. Wraps paymentService + Pusat paymentSafety.
 * A timeout is UNCERTAIN — never success or failure — and is not retried.
 */

const { paymentSafety } = require("../pusat/integrations");
const paymentService = require("../commerce/paymentService");

const PAYMENT_OUTCOME = Object.freeze({
  SUCCESS: "SUCCESS",
  FAILURE: "FAILURE",
  UNCERTAIN: "UNCERTAIN",
  BLOCKED: "BLOCKED",
  NOT_CONFIGURED: "NOT_CONFIGURED",
});

function envPresent(name) {
  return Boolean(process.env[name]);
}

function interpretProviderResult(result = {}) {
  if (result.timeout === true || result.uncertain === true || result.status === "timeout") {
    return {
      outcome: PAYMENT_OUTCOME.UNCERTAIN,
      success: false,
      failure: false,
      executed: false,
      retryable: false,
      requiresReconciliation: true,
      realMoneyMovement: false,
      note: "Timeout or uncertain provider result must be reconciled. Do not retry blindly.",
    };
  }
  if (result.blocked || result.error === "stripe_disabled" || result.error === "paypal_disabled") {
    return {
      outcome: PAYMENT_OUTCOME.BLOCKED,
      success: false,
      failure: false,
      executed: false,
      retryable: false,
      requiresReconciliation: false,
      realMoneyMovement: false,
    };
  }
  if (result.status === "failed" || result.ok === false) {
    return {
      outcome: PAYMENT_OUTCOME.FAILURE,
      success: false,
      failure: true,
      executed: false,
      retryable: false,
      requiresReconciliation: false,
      realMoneyMovement: false,
    };
  }
  return {
    outcome: PAYMENT_OUTCOME.BLOCKED,
    success: false,
    failure: false,
    executed: false,
    retryable: false,
    requiresReconciliation: false,
    realMoneyMovement: Boolean(result.realMoneyMovement),
    dryRun: true,
  };
}

function draftCharge(input = {}) {
  if (input.timeout || input.uncertain) {
    return interpretProviderResult({ timeout: true });
  }
  const safety = paymentSafety({
    kind: input.kind || "payment",
    amount: input.amount,
    currency: input.currency,
    idempotencyKey: input.idempotencyKey,
  });
  return {
    ...interpretProviderResult(safety.intent || { blocked: true }),
    live: false,
    duplicate: Boolean(safety.duplicate),
    classifiedRetryable: safety.retryable === true,
    intent: safety.intent,
  };
}

function validateWebhook({ headers = {}, secretConfigured } = {}) {
  const configured = secretConfigured === undefined ? envPresent("STRIPE_WEBHOOK_SECRET") : Boolean(secretConfigured);
  const signature = headers["stripe-signature"] || headers["paypal-transmission-sig"] || headers.signature;
  if (!configured) {
    return {
      ok: false,
      accepted: false,
      status: PAYMENT_OUTCOME.NOT_CONFIGURED,
      reason: "WEBHOOK_SECRET_MISSING",
    };
  }
  if (!signature) {
    return {
      ok: false,
      accepted: false,
      status: PAYMENT_OUTCOME.BLOCKED,
      reason: "WEBHOOK_SIGNATURE_MISSING",
    };
  }
  return {
    ok: false,
    accepted: false,
    status: PAYMENT_OUTCOME.BLOCKED,
    reason: "WEBHOOK_LIVE_VERIFICATION_BLOCKED",
    note: "Signature header present but live verification is not executed in this slice.",
  };
}

function health() {
  return {
    codeReady: true,
    liveReady: false,
    stripeConfigured: envPresent("STRIPE_SECRET_KEY"),
    paypalConfigured: envPresent("PAYPAL_CLIENT_ID"),
    webhookSecretConfigured: envPresent("STRIPE_WEBHOOK_SECRET"),
    provider: paymentService.getProviderHealth(),
    realMoneyMovement: false,
  };
}

module.exports = {
  PAYMENT_OUTCOME,
  interpretProviderResult,
  draftCharge,
  validateWebhook,
  health,
};
