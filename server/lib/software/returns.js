/**
 * Returns ledger — customer refund and supplier credit are independent.
 * Never executes a refund or assumes the supplier will reimburse Buzzard.
 */

const crypto = require("crypto");
const { RETURN_SIDE_STATUS } = require("./constants");

function newId() {
  return `swret_${crypto.randomBytes(8).toString("hex")}`;
}

function openCase(db, input = {}) {
  if (!db) throw new Error("database required");
  const orderNumber = input.orderNumber || input.order_number;
  if (!orderNumber) {
    return { ok: false, error: "order_number_required", executed: false };
  }
  if (!input.reason) {
    return { ok: false, error: "reason_required", executed: false };
  }

  let rma = null;
  try {
    const returnsRma = require("../returnsRma");
    rma = returnsRma.createReturn({
      orderNumber,
      customerId: input.customerId,
      customerEmail: input.customerEmail,
      reason: input.reason,
      type: "refund",
      refundAmount: input.refundAmount || 0,
      items: input.items || [],
    });
  } catch (error) {
    rma = { error: error.message, status: 500 };
  }

  const id = newId();
  db.prepare(`
    INSERT INTO software_return_ledger(
      id, rma_id, order_number, customer_id,
      customer_refund_status, supplier_credit_status,
      customer_refund_executed, supplier_credit_received,
      assumed_supplier_will_reimburse, details_json
    ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, ?)
  `).run(
    id,
    rma && !rma.error ? String(rma.return?.id || rma.return?.rma_number || "") : null,
    String(orderNumber),
    input.customerId || null,
    RETURN_SIDE_STATUS.REQUESTED,
    RETURN_SIDE_STATUS.NOT_REQUESTED,
    JSON.stringify({
      reason: input.reason,
      rmaError: rma?.error || null,
      refundExecuted: false,
      estimatedCustomerRefund: input.refundAmount == null ? null : Number(input.refundAmount) || 0,
      actualCustomerRefund: null,
      estimatedSupplierCredit: null,
      actualSupplierCredit: null,
    })
  );

  const opened = inspect(db, id);
  try {
    const qrLoyalty = require("./qrLoyalty");
    opened.loyalty = qrLoyalty.reevaluateForOrder(db, {
      orderRef: String(orderNumber),
      eventOrderRef: String(orderNumber),
      unresolvedReturn: true,
      returned: false,
    });
  } catch (error) {
    opened.loyalty = { ok: false, reason: error.message };
  }
  return opened;
}

function inspect(db, id) {
  const row = db.prepare("SELECT * FROM software_return_ledger WHERE id = ?").get(id);
  if (!row) return { ok: false, error: "not_found", executed: false };
  const details = readDetails(row);
  return {
    ok: true,
    id: row.id,
    rmaId: row.rma_id,
    orderNumber: row.order_number,
    customerRefund: {
      status: row.customer_refund_status,
      executed: row.customer_refund_executed === 1,
    },
    supplierCredit: {
      status: row.supplier_credit_status,
      received: row.supplier_credit_received === 1,
      assumedFromCustomerRefund: row.assumed_supplier_will_reimburse === 1,
    },
    refundExecuted: false,
    estimated: {
      customerRefund: details.estimatedCustomerRefund ?? null,
      supplierCredit: details.estimatedSupplierCredit ?? null,
      invented: false,
    },
    actual: {
      customerRefund: details.actualCustomerRefund ?? null,
      supplierCredit: row.supplier_credit_received === 1 ? details.actualSupplierCredit ?? null : null,
      executed: false,
    },
    note: "A customer refund request is not a supplier credit. Estimated amounts are not actual. Execution stays disabled.",
  };
}

function readDetails(row) {
  try {
    return JSON.parse(row.details_json || "{}");
  } catch {
    return {};
  }
}

const CUSTOMER_REFUND_TRANSITIONS = Object.freeze({
  [RETURN_SIDE_STATUS.NOT_REQUESTED]: [RETURN_SIDE_STATUS.REQUESTED, RETURN_SIDE_STATUS.BLOCKED],
  [RETURN_SIDE_STATUS.REQUESTED]: [
    RETURN_SIDE_STATUS.DRAFTED,
    RETURN_SIDE_STATUS.APPROVED,
    RETURN_SIDE_STATUS.REJECTED,
    RETURN_SIDE_STATUS.BLOCKED,
  ],
  [RETURN_SIDE_STATUS.DRAFTED]: [
    RETURN_SIDE_STATUS.APPROVED,
    RETURN_SIDE_STATUS.REJECTED,
    RETURN_SIDE_STATUS.BLOCKED,
  ],
  [RETURN_SIDE_STATUS.APPROVED]: [RETURN_SIDE_STATUS.BLOCKED],
  [RETURN_SIDE_STATUS.REJECTED]: [RETURN_SIDE_STATUS.BLOCKED],
  [RETURN_SIDE_STATUS.PENDING]: [RETURN_SIDE_STATUS.BLOCKED, RETURN_SIDE_STATUS.REJECTED],
  [RETURN_SIDE_STATUS.RECEIVED]: [],
  [RETURN_SIDE_STATUS.BLOCKED]: [],
});

function transitionCustomerRefund(db, id, status) {
  const allowed = new Set(Object.values(RETURN_SIDE_STATUS));
  if (!allowed.has(status)) {
    return { ok: false, error: "invalid_customer_refund_status", executed: false };
  }
  if (status === RETURN_SIDE_STATUS.RECEIVED) {
    return { ok: false, error: "customer_refund_execution_blocked", executed: false };
  }
  const current = inspect(db, id);
  if (!current.ok) return current;
  const from = current.customerRefund.status;
  if (from === status) {
    return { ...current, duplicate: true, executed: false };
  }
  const allowedNext = CUSTOMER_REFUND_TRANSITIONS[from] || [];
  if (!allowedNext.includes(status)) {
    return { ok: false, error: "invalid_customer_refund_transition", from, to: status, executed: false };
  }
  db.prepare(`
    UPDATE software_return_ledger
    SET customer_refund_status = ?, customer_refund_executed = 0, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(status, id);
  return { ...inspect(db, id), executed: false, refundExecuted: false };
}

function recordSupplierCredit(db, id, status) {
  const allowed = new Set(Object.values(RETURN_SIDE_STATUS));
  if (!allowed.has(status)) {
    return { ok: false, error: "invalid_supplier_credit_status", executed: false };
  }
  const current = inspect(db, id);
  if (!current.ok) return current;
  db.prepare(`
    UPDATE software_return_ledger
    SET supplier_credit_status = ?, supplier_credit_received = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(status, status === RETURN_SIDE_STATUS.RECEIVED ? 1 : 0, id);
  return inspect(db, id);
}

module.exports = {
  openCase,
  inspect,
  recordSupplierCredit,
  transitionCustomerRefund,
  CUSTOMER_REFUND_TRANSITIONS,
  RETURN_SIDE_STATUS,
};
