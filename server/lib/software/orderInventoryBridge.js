/**
 * Bind inventory reserve/consume/release to verified payment state.
 * Unsigned webhooks and client success never consume stock or authorize shipment.
 */

const inventory = require("./inventory");
const shipmentGate = require("./shipmentGate");
const { PAYMENT_STATE } = require("./secureCommerceConstants");
const { RESERVATION_STATUS } = require("./constants");

function reservationsForOrder(db, orderId) {
  if (!orderId) return [];
  return db.prepare("SELECT * FROM software_reservations WHERE order_id = ?").all(String(orderId));
}

function commitOnCapturedPayment(db, input = {}) {
  const orderId = String(input.orderId || "").trim();
  const payment = input.payment || null;
  if (!orderId) {
    return { ok: false, consumed: 0, reason: "ORDER_ID_REQUIRED", shipmentAuthorized: false };
  }
  if (input.unverifiedWebhook === true || input.official !== true) {
    return {
      ok: false,
      consumed: 0,
      reason: "UNVERIFIED_WEBHOOK",
      shipmentAuthorized: false,
    };
  }
  if (!payment || payment.captured !== true || payment.state !== PAYMENT_STATE.PAYMENT_CAPTURED) {
    return {
      ok: false,
      consumed: 0,
      reason: "PAYMENT_NOT_CAPTURED",
      shipmentAuthorized: false,
    };
  }

  const rows = reservationsForOrder(db, orderId);
  const results = [];
  for (const row of rows) {
    if (row.status === RESERVATION_STATUS.CONSUMED) {
      results.push({ id: row.id, consumed: true, duplicate: true });
      continue;
    }
    if (row.status !== RESERVATION_STATUS.ACTIVE) {
      results.push({ id: row.id, consumed: false, reason: row.status });
      continue;
    }
    const consumed = inventory.consume(db, row.id, { orderId, retry: true });
    results.push({ id: row.id, consumed: consumed.consumed === true, duplicate: consumed.duplicate === true });
  }

  const gate = shipmentGate.evaluate(db, {
    orderId,
    paymentId: payment.id,
    expectedAmount: payment.amountCents / 100,
    expectedCurrency: payment.currency,
    confirmationRequired: false,
    unverifiedWebhook: false,
  });

  return {
    ok: true,
    orderId,
    consumed: results.filter((row) => row.consumed).length,
    duplicate: results.every((row) => row.duplicate || row.consumed),
    results,
    shipmentAuthorized: false,
    shipmentGateBlocked: gate.blocked,
    salesLocked: true,
  };
}

function releaseOnCancel(db, input = {}) {
  const orderId = String(input.orderId || "").trim();
  if (!orderId) return { ok: false, released: 0, reason: "ORDER_ID_REQUIRED" };
  const rows = reservationsForOrder(db, orderId);
  let released = 0;
  let skippedConsumed = 0;
  for (const row of rows) {
    if (row.status === RESERVATION_STATUS.CONSUMED) {
      skippedConsumed += 1;
      continue;
    }
    const result = inventory.release(db, row.id);
    if (result.ok) released += 1;
  }
  return { ok: true, orderId, released, skippedConsumed, liveOrderCancelled: false };
}

function reserveForOrder(db, input = {}) {
  return inventory.reserve(db, {
    ...input,
    orderId: input.orderId,
  });
}

module.exports = {
  commitOnCapturedPayment,
  releaseOnCancel,
  reserveForOrder,
  reservationsForOrder,
};
