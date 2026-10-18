/**
 * Reserve / treasury-control transfers. Not a guarantee of irreversibility.
 * Real money movement stays disabled.
 */

const { TRANSFER_STATE } = require("./secureCommerceConstants");
const { newId, moneyCents, writeAudit, parseJson } = require("./secureIds");

function flagEnabled() {
  return process.env.BUZZARD_TRANSFER_EXECUTION === "1";
}

function draftTransfer(db, input = {}) {
  const amountCents = moneyCents(input.amount);
  const currency = String(input.currency || "EUR").toUpperCase();
  if (amountCents == null || amountCents <= 0) return { ok: false, reason: "AMOUNT_REQUIRED" };
  if (currency !== "EUR") return { ok: false, failClosed: true, reason: "CURRENCY_UNSUPPORTED" };

  if (input.idempotencyKey) {
    const existing = db.prepare("SELECT * FROM software_transfers WHERE idempotency_key = ?").get(input.idempotencyKey);
    if (existing) {
      return { ok: true, duplicate: true, executed: false, irreversible: false, transfer: mapTransfer(existing) };
    }
  }

  const id = newId("sxfer");
  db.prepare(
    `INSERT INTO software_transfers(
      id, payment_id, order_id, from_role, to_role, state, amount_cents, currency,
      idempotency_key, irreversible, executed, details_json
    ) VALUES(?,?,?,?,?,?,?,?,?,0,0,?)`
  ).run(
    id,
    input.paymentId || null,
    input.orderId || null,
    input.fromRole || "incoming",
    input.toRole || "reserve",
    TRANSFER_STATE.PENDING,
    amountCents,
    currency,
    input.idempotencyKey || null,
    JSON.stringify({
      dryRun: true,
      autoTransfer: false,
      humanApprovalRequired: true,
      executionDisabled: !flagEnabled(),
      notIrreversible: true,
    })
  );
  writeAudit(db, "transfer.draft", id, { amountCents, currency });
  return { ok: true, duplicate: false, executed: false, irreversible: false, transfer: getTransfer(db, id) };
}

function mapTransfer(row) {
  return {
    id: row.id,
    paymentId: row.payment_id,
    orderId: row.order_id,
    fromRole: row.from_role,
    toRole: row.to_role,
    state: row.state,
    amountCents: row.amount_cents,
    currency: row.currency,
    executed: row.executed === 1,
    irreversible: false,
    details: parseJson(row.details_json, {}),
  };
}

function getTransfer(db, id) {
  const row = db.prepare("SELECT * FROM software_transfers WHERE id = ?").get(id);
  return row ? mapTransfer(row) : null;
}

function markUnknown(db, id, reason) {
  db.prepare("UPDATE software_transfers SET state = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(
    TRANSFER_STATE.UNKNOWN,
    id
  );
  writeAudit(db, "transfer.unknown", id, { reason, doNotRetryBlindly: true });
  return {
    ok: true,
    transfer: getTransfer(db, id),
    requiresReconciliation: true,
    retryDuplicateForbidden: true,
    irreversible: false,
  };
}

function fail(db, id, reason) {
  db.prepare("UPDATE software_transfers SET state = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(
    TRANSFER_STATE.FAILED,
    id
  );
  writeAudit(db, "transfer.failed", id, { reason });
  return { ok: true, executed: false, irreversible: false, transfer: getTransfer(db, id) };
}

function executeReal() {
  return {
    ok: false,
    executed: false,
    irreversible: false,
    reason: flagEnabled() ? "HUMAN_APPROVAL_AND_PROVIDER_REQUIRED" : "TRANSFER_EXECUTION_DISABLED",
  };
}

function exposure(capturedCents, reservedCents, chargebackCents) {
  return {
    capturedCents: capturedCents || 0,
    reservedCents: reservedCents || 0,
    expectedChargebackExposureCents: chargebackCents || 0,
    reserveDoesNotEliminateLiability: true,
  };
}

module.exports = {
  draftTransfer,
  getTransfer,
  markUnknown,
  fail,
  executeReal,
  exposure,
  TRANSFER_STATE,
};
