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

function moneyOrNull(value) {
  if (value == null || value === "") return { present: false, value: null };
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return { invalid: true, value: null };
  if (!/^\d+(\.\d{1,2})?$/.test(String(value))) return { invalid: true, value: null };
  return { present: true, value };
}

function separateRefundAndCredit({ customerRefund, supplierCredit } = {}) {
  const customer = moneyOrNull(customerRefund);
  const supplier = moneyOrNull(supplierCredit);
  if (customer.invalid || supplier.invalid) {
    return {
      ok: false,
      code: "INVALID_AMOUNT",
      customerRefund: null,
      supplierCredit: null,
      reconciled: false,
      mixed: false,
      assumeSupplierRepaysCustomer: false,
      refunded: false,
    };
  }
  return {
    ok: false,
    code: "PROVIDER_NOT_LIVE",
    customerRefund: customer.present ? customer.value : null,
    supplierCredit: supplier.present ? supplier.value : null,
    reconciled: false,
    mixed: false,
    assumeSupplierRepaysCustomer: false,
    refunded: false,
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
