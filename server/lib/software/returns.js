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
    })
  );

  return inspect(db, id);
}

function inspect(db, id) {
  const row = db.prepare("SELECT * FROM software_return_ledger WHERE id = ?").get(id);
  if (!row) return { ok: false, error: "not_found", executed: false };
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
    note: "A customer refund request is not a supplier credit. Execution stays disabled.",
  };
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

module.exports = { openCase, inspect, recordSupplierCredit, RETURN_SIDE_STATUS };
