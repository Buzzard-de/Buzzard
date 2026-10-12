/**
 * Disputes and chargebacks. Separate from supplier credit and customer refunds.
 * Signed delivery or reserve transfer does not eliminate chargeback risk.
 */

const { DISPUTE_KIND } = require("./secureCommerceConstants");
const { PAYMENT_STATE } = require("./paymentLifecycle");
const paymentLifecycle = require("./paymentLifecycle");
const { newId, writeAudit, parseJson } = require("./secureIds");

function open(db, input = {}) {
  const orderId = String(input.orderId || "").trim();
  const kind = input.kind || DISPUTE_KIND.DELIVERY_DISPUTE;
  if (!orderId) return { ok: false, reason: "ORDER_REQUIRED" };
  if (!Object.values(DISPUTE_KIND).includes(kind)) return { ok: false, reason: "KIND_INVALID" };

  if (input.eventId) {
    const existing = db.prepare("SELECT * FROM software_disputes WHERE event_id = ?").get(input.eventId);
    if (existing) return { ok: true, duplicate: true, dispute: map(existing) };
  }

  const id = newId("sdisp");
  db.prepare(
    `INSERT INTO software_disputes(id, order_id, payment_id, shipment_id, kind, state, event_id, details_json)
     VALUES(?,?,?,?,?,'OPEN',?,?)`
  ).run(
    id,
    orderId,
    input.paymentId || null,
    input.shipmentId || null,
    kind,
    input.eventId || null,
    JSON.stringify({
      deliveredStatusNotAutoReject: true,
      signatureDoesNotEliminateChargeback: true,
      reserveDoesNotEliminateChargeback: true,
      supplierCreditAssumed: false,
      refundExecuted: false,
    })
  );

  if (kind === DISPUTE_KIND.CHARGEBACK && input.paymentId) {
    paymentLifecycle.applyState(db, input.paymentId, PAYMENT_STATE.CHARGEBACK, "chargeback_event");
  } else if (kind === DISPUTE_KIND.PROVIDER_REVERSAL && input.paymentId) {
    paymentLifecycle.applyState(db, input.paymentId, PAYMENT_STATE.PAYMENT_DISPUTED, "provider_reversal");
  }

  writeAudit(db, "dispute.open", orderId, { id, kind });
  return { ok: true, duplicate: false, executed: false, dispute: get(db, id) };
}

function map(row) {
  return {
    id: row.id,
    orderId: row.order_id,
    paymentId: row.payment_id,
    shipmentId: row.shipment_id,
    kind: row.kind,
    state: row.state,
    details: parseJson(row.details_json, {}),
  };
}

function get(db, id) {
  const row = db.prepare("SELECT * FROM software_disputes WHERE id = ?").get(id);
  return row ? map(row) : null;
}

function blockingForOrder(db, orderId) {
  const rows = db
    .prepare("SELECT * FROM software_disputes WHERE order_id = ? AND state IN ('OPEN','REVIEW')")
    .all(orderId);
  return rows.map(map);
}

module.exports = { open, get, blockingForOrder, DISPUTE_KIND };
