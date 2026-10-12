/**
 * Explainable payment/order risk. No invented probability. No criminal label.
 * Unknown provider status is never LOW_RISK.
 */

const { RISK_OUTCOME } = require("./secureCommerceConstants");
const { newId, writeAudit } = require("./secureIds");

const DEFAULTS = Object.freeze({
  highValueEur: 250,
  duplicateAttemptLimit: 3,
  note: "Thresholds are defaults for tests. Business approval required before production use.",
});

function assess(input = {}) {
  const signals = [];
  const reasons = [];

  if (input.providerStatus == null || input.providerStatus === "UNKNOWN" || input.providerUnavailable) {
    signals.push({ type: "provider_unknown", weight: "review" });
    reasons.push("PROVIDER_STATUS_UNKNOWN");
  }
  if (input.amount == null || input.currency == null) {
    signals.push({ type: "missing_payment_fields", weight: "review" });
    reasons.push("MISSING_PAYMENT_FIELDS");
  }
  if (input.expectedAmount != null && Number(input.amount) !== Number(input.expectedAmount)) {
    signals.push({ type: "amount_mismatch", weight: "block" });
    reasons.push("AMOUNT_MISMATCH");
  }
  if (input.expectedCurrency && input.currency && input.currency !== input.expectedCurrency) {
    signals.push({ type: "currency_mismatch", weight: "block" });
    reasons.push("CURRENCY_MISMATCH");
  }
  if (Number(input.amount) >= (input.highValueEur || DEFAULTS.highValueEur)) {
    signals.push({ type: "high_value", weight: "review" });
    reasons.push("HIGH_VALUE");
  }
  if (Number(input.failedAttempts || 0) >= (input.duplicateAttemptLimit || DEFAULTS.duplicateAttemptLimit)) {
    signals.push({ type: "repeated_failures", weight: "review" });
    reasons.push("REPEATED_FAILED_ATTEMPTS");
  }
  if (input.addressMismatch === true) {
    signals.push({ type: "address_mismatch", weight: "review" });
    reasons.push("ADDRESS_MISMATCH_NOT_PROOF");
  }
  if (input.previousChargeback === true) {
    signals.push({ type: "previous_chargeback", weight: "block" });
    reasons.push("PREVIOUS_CHARGEBACK");
  }
  if (input.providerFraudFlag === true) {
    signals.push({ type: "provider_fraud_flag", weight: "block" });
    reasons.push("PROVIDER_FRAUD_FLAG");
  }
  if (input.conflictingAccountInfo === true) {
    signals.push({ type: "conflicting_account_info", weight: "review" });
    reasons.push("CONFLICTING_ACCOUNT_INFO");
  }

  const blocked = signals.some((s) => s.weight === "block");
  const review = signals.some((s) => s.weight === "review");
  let outcome = RISK_OUTCOME.LOW_RISK;
  if (blocked) outcome = RISK_OUTCOME.HIGH_RISK_BLOCKED;
  else if (review) outcome = RISK_OUTCOME.REVIEW_REQUIRED;

  return {
    outcome,
    reasons,
    signals,
    explainable: true,
    inventedProbability: false,
    criminalLabel: false,
    addressMismatchIsNotFraudProof: true,
    providerUnknownIsNotLowRisk: true,
    defaults: DEFAULTS,
    shipmentBlocked: outcome === RISK_OUTCOME.HIGH_RISK_BLOCKED,
    reviewRequired: outcome !== RISK_OUTCOME.LOW_RISK,
  };
}

function persist(db, orderId, assessment) {
  const id = newId("srisk");
  db.prepare(
    `INSERT INTO software_risk_assessments(id, order_id, outcome, reasons_json, signals_json, details_json)
     VALUES(?,?,?,?,?,?)`
  ).run(
    id,
    orderId,
    assessment.outcome,
    JSON.stringify(assessment.reasons),
    JSON.stringify(assessment.signals),
    JSON.stringify({ inventedProbability: false })
  );
  writeAudit(db, "risk.assess", orderId, { outcome: assessment.outcome, reasons: assessment.reasons });
  return { id, ...assessment };
}

function resolveReview(current, decision) {
  if (current.outcome !== RISK_OUTCOME.REVIEW_REQUIRED) {
    return { ok: false, reason: "NOT_IN_REVIEW" };
  }
  if (decision === "approve") {
    return { ok: true, outcome: RISK_OUTCOME.LOW_RISK, resolved: true, falsePositivePath: true };
  }
  if (decision === "block") {
    return { ok: true, outcome: RISK_OUTCOME.HIGH_RISK_BLOCKED, resolved: true };
  }
  return { ok: false, reason: "DECISION_REQUIRED" };
}

module.exports = { assess, persist, resolveReview, DEFAULTS, RISK_OUTCOME };
