/**
 * Authoritative payment state machine. Browser success is not payment proof.
 * Timeouts are UNCERTAIN / RECONCILIATION_REQUIRED, never success.
 */

const crypto = require("crypto");
const { PAYMENT_STATE, PAYMENT_TRANSITIONS } = require("./secureCommerceConstants");
const { newId, moneyCents, writeAudit, parseJson, timingEqualHex } = require("./secureIds");

function allowedNext(from) {
  return PAYMENT_TRANSITIONS[from] || [];
}

function canTransition(from, to) {
  if (from === to) return true;
  return allowedNext(from).includes(to);
}

function createPayment(db, input = {}) {
  const orderId = String(input.orderId || "").trim();
  const currency = String(input.currency || "EUR").trim().toUpperCase();
  const amountCents = moneyCents(input.amount ?? input.amountCents / 100);
  if (!orderId) return { ok: false, reason: "ORDER_REQUIRED" };
  if (currency !== "EUR") return { ok: false, failClosed: true, reason: "CURRENCY_UNSUPPORTED", currency };
  if (amountCents == null || amountCents <= 0) return { ok: false, reason: "AMOUNT_REQUIRED" };

  if (input.idempotencyKey) {
    const existing = db.prepare("SELECT * FROM software_payments WHERE idempotency_key = ?").get(input.idempotencyKey);
    if (existing) return { ok: true, duplicate: true, payment: mapPayment(existing) };
  }

  const id = newId("spay");
  db.prepare(
    `INSERT INTO software_payments(
      id, order_id, provider, state, amount_cents, currency, capture_required, idempotency_key, details_json
    ) VALUES(?,?,?,?,?,?,?,?,?)`
  ).run(
    id,
    orderId,
    input.provider || "mock",
    PAYMENT_STATE.PAYMENT_PENDING,
    amountCents,
    currency,
    input.captureRequired === false ? 0 : 1,
    input.idempotencyKey || null,
    JSON.stringify({
      realMoneyMovement: false,
      clientStatusIgnored: true,
      timeoutIsNotSuccess: true,
    })
  );
  writeAudit(db, "payment.create", id, { orderId, amountCents, currency });
  return { ok: true, duplicate: false, payment: getPayment(db, id) };
}

function getPayment(db, id) {
  const row = db.prepare("SELECT * FROM software_payments WHERE id = ?").get(id);
  return row ? mapPayment(row) : null;
}

function mapPayment(row) {
  return {
    id: row.id,
    orderId: row.order_id,
    provider: row.provider,
    state: row.state,
    amountCents: row.amount_cents,
    currency: row.currency,
    captureRequired: row.capture_required === 1,
    captured: row.state === PAYMENT_STATE.PAYMENT_CAPTURED,
    authorizedOnly: row.state === PAYMENT_STATE.PAYMENT_AUTHORIZED,
    reconciliationRequired: row.state === PAYMENT_STATE.PAYMENT_RECONCILIATION_REQUIRED,
    disputed: row.state === PAYMENT_STATE.PAYMENT_DISPUTED || row.state === PAYMENT_STATE.CHARGEBACK,
    realMoneyMovement: false,
    irreversible: false,
    details: parseJson(row.details_json, {}),
  };
}

function applyState(db, paymentId, to, reason) {
  const row = db.prepare("SELECT * FROM software_payments WHERE id = ?").get(paymentId);
  if (!row) return { ok: false, reason: "PAYMENT_NOT_FOUND" };
  if (row.state === to) return { ok: true, duplicate: true, payment: mapPayment(row) };
  if (!canTransition(row.state, to)) {
    writeAudit(db, "payment.illegal_transition", paymentId, { from: row.state, to, reason });
    return { ok: false, reason: "ILLEGAL_TRANSITION", from: row.state, to };
  }
  db.prepare("UPDATE software_payments SET state = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(to, paymentId);
  writeAudit(db, "payment.transition", paymentId, { from: row.state, to, reason });
  return { ok: true, payment: getPayment(db, paymentId), from: row.state, to };
}

function verifyWebhookSignature({ rawBody, signature, secret, timestamp } = {}) {
  if (!secret) {
    return { ok: false, accepted: false, reason: "WEBHOOK_SECRET_MISSING", status: "NOT_CONFIGURED" };
  }
  if (!signature) {
    return { ok: false, accepted: false, reason: "WEBHOOK_SIGNATURE_MISSING" };
  }
  const body = String(rawBody || "");
  let expected;
  if (timestamp) {
    expected = crypto.createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  } else {
    expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  }
  const provided = String(signature).includes("=")
    ? String(signature).split("v1=").pop().split(",")[0]
    : String(signature);
  if (!timingEqualHex(expected, provided)) {
    return { ok: false, accepted: false, reason: "WEBHOOK_SIGNATURE_INVALID" };
  }
  return { ok: true, accepted: true, reason: "WEBHOOK_SIGNATURE_OK" };
}

function ingestEvent(db, input = {}) {
  const signature = verifyWebhookSignature({
    rawBody: input.rawBody,
    signature: input.signature,
    secret: input.secret,
    timestamp: input.timestamp,
  });
  if (!signature.ok) {
    writeAudit(db, "payment.webhook_rejected", input.paymentId || input.eventId, { reason: signature.reason });
    return { ...signature, applied: false, financialEffect: false };
  }

  if (input.timeout === true || input.uncertain === true) {
    const payment = input.paymentId ? getPayment(db, input.paymentId) : null;
    if (payment) applyState(db, payment.id, PAYMENT_STATE.PAYMENT_RECONCILIATION_REQUIRED, "timeout");
    return {
      ok: true,
      accepted: true,
      applied: Boolean(payment),
      success: false,
      financialEffect: false,
      requiresReconciliation: true,
      reason: "PROVIDER_TIMEOUT_NOT_SUCCESS",
    };
  }

  const eventId = String(input.eventId || "").trim();
  if (!eventId) return { ok: false, accepted: false, reason: "EVENT_ID_REQUIRED" };

  const existing = db.prepare("SELECT * FROM software_payment_events WHERE event_id = ?").get(eventId);
  if (existing) {
    return {
      ok: true,
      accepted: true,
      duplicate: true,
      applied: false,
      financialEffect: false,
      reason: "DUPLICATE_EVENT",
      event: existing,
    };
  }

  const payment = getPayment(db, input.paymentId);
  if (!payment) return { ok: false, accepted: false, reason: "PAYMENT_NOT_FOUND" };

  const amountCents = moneyCents(input.amount ?? payment.amountCents / 100);
  const currency = String(input.currency || payment.currency).toUpperCase();
  if (currency !== payment.currency || amountCents !== payment.amountCents) {
    db.prepare(
      `INSERT INTO software_payment_events(id, payment_id, event_id, event_type, accepted, applied, reason, details_json)
       VALUES(?,?,?,?,0,0,?,?)`
    ).run(newId("spevt"), payment.id, eventId, input.eventType || "unknown", "AMOUNT_CURRENCY_MISMATCH", "{}");
    applyState(db, payment.id, PAYMENT_STATE.PAYMENT_REVIEW, "amount_currency_mismatch");
    return { ok: false, accepted: false, applied: false, reason: "AMOUNT_CURRENCY_MISMATCH" };
  }

  const target = input.targetState;
  if (!target || !Object.values(PAYMENT_STATE).includes(target)) {
    return { ok: false, accepted: false, reason: "TARGET_STATE_REQUIRED" };
  }

  const applied = applyState(db, payment.id, target, input.eventType || target);
  db.prepare(
    `INSERT INTO software_payment_events(id, payment_id, event_id, event_type, accepted, applied, reason, details_json)
     VALUES(?,?,?,?,1,?,?,?)`
  ).run(
    newId("spevt"),
    payment.id,
    eventId,
    input.eventType || target,
    applied.ok ? 1 : 0,
    applied.reason || null,
    JSON.stringify({ from: applied.from || payment.state, to: target })
  );
  db.prepare("UPDATE software_payments SET last_event_id = ? WHERE id = ?").run(eventId, payment.id);

  return {
    ok: applied.ok,
    accepted: true,
    applied: applied.ok && !applied.duplicate,
    duplicate: Boolean(applied.duplicate),
    financialEffect: applied.ok && applied.to === PAYMENT_STATE.PAYMENT_CAPTURED,
    payment: applied.payment || getPayment(db, payment.id),
    reason: applied.reason || null,
  };
}

function clientStatusIsNotProof(clientStatus) {
  return {
    authoritative: false,
    accepted: false,
    reason: "CLIENT_STATUS_NOT_AUTHORITATIVE",
    clientStatus: clientStatus || null,
    shipmentAuthorized: false,
  };
}

module.exports = {
  PAYMENT_STATE,
  canTransition,
  createPayment,
  getPayment,
  applyState,
  verifyWebhookSignature,
  ingestEvent,
  clientStatusIsNotProof,
};
