/**
 * Authoritative shipment eligibility. Independent cumulative checks.
 * Confirmation ≠ payment. Signature ≠ payment. Reserve transfer ≠ irreversible.
 */

const { isSalesEnabled } = require("../salesMode");
const { PAYMENT_STATE } = require("./secureCommerceConstants");
const { RISK_OUTCOME } = require("./paymentRisk");
const { CONFIRMATION_STATE } = require("./orderConfirmation");
const paymentLifecycle = require("./paymentLifecycle");
const paymentRisk = require("./paymentRisk");
const confirmation = require("./orderConfirmation");
const signaturePolicy = require("./signaturePolicy");
const disputes = require("./disputes");
const { moneyCents, writeAudit } = require("./secureIds");

function evaluate(db, input = {}) {
  const reasons = [];
  const checks = {};

  checks.salesLocked = !isSalesEnabled();
  if (checks.salesLocked) reasons.push("SALES_LOCKED");

  if (input.orderCancelled === true) {
    checks.orderCancelled = true;
    reasons.push("ORDER_CANCELLED");
  } else checks.orderCancelled = false;

  if (input.orderFulfilled === true) {
    checks.orderFulfilled = true;
    reasons.push("ORDER_ALREADY_FULFILLED");
  } else checks.orderFulfilled = false;

  const payment = input.paymentId ? paymentLifecycle.getPayment(db, input.paymentId) : input.payment || null;
  checks.paymentPresent = Boolean(payment);
  if (!payment) reasons.push("PAYMENT_MISSING");
  else {
    checks.currencyMatch = payment.currency === (input.expectedCurrency || "EUR") && payment.currency === "EUR";
    if (!checks.currencyMatch) reasons.push("CURRENCY_MISMATCH");
    const expectedCents = moneyCents(input.expectedAmount ?? payment.amountCents / 100);
    checks.amountMatch = expectedCents === payment.amountCents;
    if (!checks.amountMatch) reasons.push("AMOUNT_MISMATCH");
    checks.reconciliationRequired = payment.state === PAYMENT_STATE.PAYMENT_RECONCILIATION_REQUIRED;
    if (checks.reconciliationRequired) reasons.push("RECONCILIATION_REQUIRED");
    checks.disputed = payment.disputed;
    if (checks.disputed) reasons.push("PAYMENT_DISPUTED");
    const captureRequired = payment.captureRequired !== false;
    checks.captureRequired = captureRequired;
    checks.authorizedOnly = payment.state === PAYMENT_STATE.PAYMENT_AUTHORIZED;
    checks.captured = payment.state === PAYMENT_STATE.PAYMENT_CAPTURED;
    if (captureRequired && !checks.captured) reasons.push("CAPTURE_REQUIRED");
    if (!captureRequired && !checks.captured && !checks.authorizedOnly) reasons.push("PAYMENT_NOT_AUTHORITATIVE");
    if (input.clientPaymentStatus) {
      checks.clientStatusRejected = true;
      reasons.push("CLIENT_STATUS_NOT_AUTHORITATIVE");
    }
  }

  const risk = input.risk || paymentRisk.assess(input.riskInput || {});
  checks.riskOutcome = risk.outcome;
  if (risk.outcome === RISK_OUTCOME.HIGH_RISK_BLOCKED) reasons.push("HIGH_RISK_BLOCKED");
  if (risk.outcome === RISK_OUTCOME.REVIEW_REQUIRED && input.allowReviewShip !== true) {
    reasons.push("RISK_REVIEW_REQUIRED");
  }

  if (input.confirmationRequired !== false) {
    const current = input.confirmation || (input.orderId ? confirmation.currentForOrder(db, input.orderId) : null);
    checks.confirmationState = current?.state || CONFIRMATION_STATE.NO_RESPONSE;
    if (!current || current.state === CONFIRMATION_STATE.PENDING) reasons.push("CUSTOMER_NO_RESPONSE");
    if (current?.state === CONFIRMATION_STATE.CUSTOMER_REJECTED) reasons.push("CUSTOMER_REJECTED");
    if (current?.state === CONFIRMATION_STATE.NOTIFICATION_FAILED) reasons.push("NOTIFICATION_FAILED");
    if (current?.state === CONFIRMATION_STATE.EXPIRED) reasons.push("CONFIRMATION_EXPIRED");
    if (current?.state === CONFIRMATION_STATE.CUSTOMER_CONFIRMED) {
      checks.customerConfirmed = true;
      checks.confirmationIsNotPayment = true;
    }
  } else {
    checks.confirmationRequired = false;
  }

  if (input.orderId) {
    const open = disputes.blockingForOrder(db, input.orderId);
    checks.openDisputes = open.length;
    if (open.length) reasons.push("OPEN_DISPUTE");
  }

  if (input.stockReliable === false) {
    checks.stockReliable = false;
    reasons.push("STOCK_UNRELIABLE");
  } else checks.stockReliable = true;

  const delivery = input.deliveryPolicy || signaturePolicy.evaluate(input.signatureInput || {});
  checks.deliveryPolicy = delivery;
  if (delivery.allowAutomaticShipment === false) reasons.push(delivery.reason || "DELIVERY_POLICY_BLOCKS");

  if (input.reserveTransferClaimedIrreversible === true) {
    checks.reserveNotIrreversible = true;
    reasons.push("RESERVE_NOT_IRREVERSIBLE");
  }

  const allowed = reasons.length === 0;
  const result = {
    allowed,
    blocked: !allowed,
    reasons,
    checks,
    shipmentCreated: false,
    liveCarrier: false,
    commercial: false,
    supplierSubmitted: false,
    safeRetry: !allowed,
    humanReview: reasons.includes("RISK_REVIEW_REQUIRED") || reasons.includes("HIGH_RISK_BLOCKED"),
  };
  writeAudit(db, "shipment.gate", input.orderId || input.paymentId || "unknown", {
    allowed,
    reasons,
  });
  return result;
}

module.exports = { evaluate };
