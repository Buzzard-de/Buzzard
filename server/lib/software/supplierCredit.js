/**
 * Supplier cancel / credit records. Independent from customer refunds.
 * Never sends a live purchase-order cancel or books money.
 */

const crypto = require("crypto");

const CANCEL_STATUS = Object.freeze({
  DRAFT: "DRAFT",
  REQUESTED: "REQUESTED",
  BLOCKED: "BLOCKED",
  SENT: "SENT",
});

function draftCancel(input = {}) {
  return {
    ok: true,
    id: `scc_${crypto.randomBytes(8).toString("hex")}`,
    purchaseOrderId: input.purchaseOrderId || null,
    supplier: input.supplier || null,
    status: CANCEL_STATUS.DRAFT,
    sent: false,
    live: false,
    reason: input.reason || "operator_draft",
    distinctFromCustomerRefund: true,
  };
}

function requestCancel(input = {}) {
  const draft = draftCancel(input);
  return {
    ...draft,
    status: CANCEL_STATUS.BLOCKED,
    sent: false,
    live: false,
    reason: "SUPPLIER_CANCEL_NOT_SENT",
    note: "Cancel is recorded only. No supplier API is called.",
  };
}

function recordCredit(input = {}) {
  return {
    ok: true,
    id: `scr_${crypto.randomBytes(8).toString("hex")}`,
    supplier: input.supplier || null,
    amount: input.amount == null ? null : Number(input.amount),
    currency: String(input.currency || "EUR").toUpperCase(),
    received: false,
    assumed: false,
    executed: false,
    distinctFromCustomerRefund: true,
    distinctFromChargeback: true,
    note: "Supplier credit is a record, not a customer refund and not a bank booking.",
  };
}

function reconcileOrder(input = {}) {
  return {
    ok: true,
    dryRun: true,
    executed: false,
    orderId: input.orderId || null,
    customerRefund: "separate",
    supplierCredit: "separate",
    matched: false,
    live: false,
    reason: "RECONCILE_DRY_RUN",
  };
}

module.exports = {
  CANCEL_STATUS,
  draftCancel,
  requestCancel,
  recordCredit,
  reconcileOrder,
};
