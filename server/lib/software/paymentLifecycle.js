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
  const details = parseJson(row.details_json, {});
  return {
    id: row.id,
    orderId: row.order_id,
    provider: row.provider,
    providerPaymentId: row.provider_payment_id || details.providerPaymentId || null,
    state: row.state,
    amountCents: row.amount_cents,
    currency: row.currency,
    captureRequired: row.capture_required === 1,
    captured: row.state === PAYMENT_STATE.PAYMENT_CAPTURED,
    authorizedOnly: row.state === PAYMENT_STATE.PAYMENT_AUTHORIZED,
    requiresCustomerAction: row.state === PAYMENT_STATE.PAYMENT_REQUIRES_CUSTOMER_ACTION,
    capturePending: row.state === PAYMENT_STATE.PAYMENT_CAPTURE_PENDING,
    partiallyRefunded: row.state === PAYMENT_STATE.PAYMENT_PARTIALLY_REFUNDED,
    refunded: row.state === PAYMENT_STATE.PAYMENT_REFUNDED,
    reconciliationRequired: row.state === PAYMENT_STATE.PAYMENT_RECONCILIATION_REQUIRED,
    disputed: row.state === PAYMENT_STATE.PAYMENT_DISPUTED || row.state === PAYMENT_STATE.CHARGEBACK,
    realMoneyMovement: false,
    irreversible: false,
    details,
  };
}

function getPaymentByProviderRef(db, provider, providerPaymentId) {
  if (!provider || !providerPaymentId) return null;
  const row = db
    .prepare("SELECT * FROM software_payments WHERE provider = ? AND provider_payment_id = ?")
    .get(provider, providerPaymentId);
  return row ? mapPayment(row) : null;
}

function attachProviderRef(db, paymentId, providerPaymentId) {
  const payment = getPayment(db, paymentId);
  if (!payment || !providerPaymentId) return payment;
  const existing = getPaymentByProviderRef(db, payment.provider, providerPaymentId);
  if (existing && existing.id !== paymentId) {
    writeAudit(db, "payment.provider_ref_conflict", paymentId, { providerPaymentId });
    return payment;
  }
  const details = { ...payment.details, providerPaymentId };
  try {
    db.prepare(
      `UPDATE software_payments
       SET provider_payment_id = ?, details_json = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(String(providerPaymentId), JSON.stringify(details), paymentId);
  } catch (err) {
    if (!isUniqueConstraint(err)) throw err;
    writeAudit(db, "payment.provider_ref_conflict", paymentId, { providerPaymentId });
    return payment;
  }
  return getPayment(db, paymentId);
}

function isUniqueConstraint(err) {
  return err && (err.code === "SQLITE_CONSTRAINT_UNIQUE" || /UNIQUE/i.test(String(err.message || "")));
}

function recordEventExclusive(db, input = {}) {
  try {
    db.prepare(
      `INSERT INTO software_payment_events(id, payment_id, event_id, event_type, accepted, applied, reason, details_json)
       VALUES(?,?,?,?,?,?,?,?)`
    ).run(
      newId("spevt"),
      input.paymentId,
      input.eventId,
      input.eventType || "unknown",
      input.accepted ? 1 : 0,
      input.applied ? 1 : 0,
      input.reason || null,
      JSON.stringify(input.details || {})
    );
    return { inserted: true, duplicate: false };
  } catch (err) {
    if (isUniqueConstraint(err)) return { inserted: false, duplicate: true };
    throw err;
  }
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
    recordEventExclusive(db, {
      paymentId: payment.id,
      eventId,
      eventType: input.eventType || "unknown",
      accepted: false,
      applied: false,
      reason: "AMOUNT_CURRENCY_MISMATCH",
    });
    applyState(db, payment.id, PAYMENT_STATE.PAYMENT_REVIEW, "amount_currency_mismatch");
    return { ok: false, accepted: false, applied: false, reason: "AMOUNT_CURRENCY_MISMATCH" };
  }

  const target = input.targetState;
  if (!target || !Object.values(PAYMENT_STATE).includes(target)) {
    return { ok: false, accepted: false, reason: "TARGET_STATE_REQUIRED" };
  }

  const reserved = recordEventExclusive(db, {
    paymentId: payment.id,
    eventId,
    eventType: input.eventType || target,
    accepted: true,
    applied: false,
    reason: "RESERVED",
    details: { to: target },
  });
  if (reserved.duplicate) {
    return {
      ok: true,
      accepted: true,
      duplicate: true,
      applied: false,
      financialEffect: false,
      reason: "DUPLICATE_EVENT",
    };
  }

  const applied = applyState(db, payment.id, target, input.eventType || target);
  db.prepare(
    "UPDATE software_payment_events SET applied = ?, reason = ?, details_json = ? WHERE event_id = ?"
  ).run(
    applied.ok && !applied.duplicate ? 1 : 0,
    applied.reason || null,
    JSON.stringify({ from: applied.from || payment.state, to: target }),
    eventId
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

function ingestVerifiedEvent(db, input = {}) {
  if (input.timeout === true || input.uncertain === true) {
    const payment = input.paymentId ? getPayment(db, input.paymentId) : null;
    if (payment) applyState(db, payment.id, PAYMENT_STATE.PAYMENT_RECONCILIATION_REQUIRED, "timeout");
    return {
      ok: true,
      accepted: true,
      applied: Boolean(payment),
      success: false,
      financialEffect: false,
      shipmentAuthorized: false,
      requiresReconciliation: true,
      reason: "PROVIDER_TIMEOUT_NOT_SUCCESS",
    };
  }

  const eventId = String(input.eventId || "").trim();
  if (!eventId) return { ok: false, accepted: false, reason: "EVENT_ID_REQUIRED", shipmentAuthorized: false };

  const existing = db.prepare("SELECT * FROM software_payment_events WHERE event_id = ?").get(eventId);
  if (existing) {
    return {
      ok: true,
      accepted: true,
      duplicate: true,
      applied: false,
      financialEffect: false,
      shipmentAuthorized: false,
      reason: "DUPLICATE_EVENT",
    };
  }

  const payment = getPayment(db, input.paymentId);
  if (!payment) return { ok: false, accepted: false, reason: "PAYMENT_NOT_FOUND", shipmentAuthorized: false };

  if (input.amount != null || input.currency) {
    const amountCents = moneyCents(input.amount ?? payment.amountCents / 100);
    const currency = String(input.currency || payment.currency).toUpperCase();
    if (currency !== payment.currency || amountCents !== payment.amountCents) {
      recordEventExclusive(db, {
        paymentId: payment.id,
        eventId,
        eventType: input.eventType || "unknown",
        accepted: false,
        applied: false,
        reason: "AMOUNT_CURRENCY_MISMATCH",
      });
      applyState(db, payment.id, PAYMENT_STATE.PAYMENT_REVIEW, "amount_currency_mismatch");
      return {
        ok: false,
        accepted: false,
        applied: false,
        shipmentAuthorized: false,
        reason: "AMOUNT_CURRENCY_MISMATCH",
      };
    }
  }

  const target = input.targetState;
  if (!target || !Object.values(PAYMENT_STATE).includes(target)) {
    return { ok: false, accepted: false, reason: "TARGET_STATE_REQUIRED", shipmentAuthorized: false };
  }

  const reserved = recordEventExclusive(db, {
    paymentId: payment.id,
    eventId,
    eventType: input.eventType || target,
    accepted: true,
    applied: false,
    reason: "RESERVED",
    details: { to: target, officialVerify: true },
  });
  if (reserved.duplicate) {
    return {
      ok: true,
      accepted: true,
      duplicate: true,
      applied: false,
      financialEffect: false,
      shipmentAuthorized: false,
      reason: "DUPLICATE_EVENT",
    };
  }

  const applied = applyState(db, payment.id, target, input.eventType || target);
  db.prepare(
    "UPDATE software_payment_events SET applied = ?, reason = ?, details_json = ? WHERE event_id = ?"
  ).run(
    applied.ok && !applied.duplicate ? 1 : 0,
    applied.reason || (applied.ok ? null : "ILLEGAL_TRANSITION"),
    JSON.stringify({ from: applied.from || payment.state, to: target, officialVerify: true }),
    eventId
  );
  if (applied.ok) {
    db.prepare("UPDATE software_payments SET last_event_id = ? WHERE id = ?").run(eventId, payment.id);
  }

  const next = applied.payment || getPayment(db, payment.id);
  return {
    ok: applied.ok,
    accepted: true,
    applied: applied.ok && !applied.duplicate,
    duplicate: Boolean(applied.duplicate),
    financialEffect: false,
    shipmentAuthorized: false,
    payment: next,
    captured: next?.captured === true,
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
  getPaymentByProviderRef,
  attachProviderRef,
  applyState,
  verifyWebhookSignature,
  ingestEvent,
  ingestVerifiedEvent,
  clientStatusIsNotProof,
};
