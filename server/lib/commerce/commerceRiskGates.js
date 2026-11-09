/**
 * Commerce risk gates. Synthetic enforcement. Sales stay closed.
 */
const { isSalesEnabled } = require("../salesMode");
const { hasPermission } = require("../pusat/council");

function buyStockBeforeOrder({ orderId, actorId = "stock_ai" } = {}) {
  if (!orderId) {
    return { ok: false, code: "STOCK_BUY_BEFORE_ORDER_DENIED", purchased: false };
  }
  return { ok: false, code: "STOCK_BUY_NOT_AUTHORIZED", purchased: false, actorId };
}

function paySupplier({ actorId = "logistics_ai", approved = false } = {}) {
  return {
    ok: false,
    code: "SUPPLIER_PAYMENT_DENIED",
    paid: false,
    actorId,
    approved,
  };
}

function separateRefundAndCredit({ customerRefund = 0, supplierCredit = 0 } = {}) {
  return {
    customerRefund: Number(customerRefund) || 0,
    supplierCredit: Number(supplierCredit) || 0,
    mixed: false,
    assumeSupplierRepaysCustomer: false,
  };
}

function aiAction({ actorId, permission } = {}) {
  if (!hasPermission(actorId, permission)) {
    return { ok: false, code: "AI_PERMISSION_DENIED", started: false };
  }
  return { ok: true, started: false, note: "Permission exists; execution still dry-run." };
}

function salesLock() {
  return { salesEnabled: isSalesEnabled() === true, ordersAllowed: false };
}

module.exports = {
  buyStockBeforeOrder,
  paySupplier,
  separateRefundAndCredit,
  aiAction,
  salesLock,
};
