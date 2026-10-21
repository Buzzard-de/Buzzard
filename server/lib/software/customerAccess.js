/**
 * Customer data isolation. Another customer's order or shipment is never returned.
 */

const customerOrderBridge = require("../customer/customerOrderBridge");

function assertOwnOrder({ orderCustomerId, requesterCustomerId }) {
  if (!requesterCustomerId) {
    return { ok: false, denied: true, reason: "CUSTOMER_REQUIRED" };
  }
  if (!orderCustomerId || orderCustomerId !== requesterCustomerId) {
    return { ok: false, denied: true, reason: "ACCESS_DENIED" };
  }
  return { ok: true, denied: false };
}

function getOwnOrder({ orderId, customerId, email }) {
  if (!customerId && !email) {
    return { ok: false, denied: true, reason: "CUSTOMER_REQUIRED", order: null };
  }
  const order = customerOrderBridge.getCustomerOrder(orderId, customerId, email);
  if (!order) {
    return { ok: false, denied: true, reason: "NOT_FOUND_OR_DENIED", order: null };
  }
  return { ok: true, order };
}

function listOwnOrders({ customerId, email }) {
  if (!customerId && !email) return { ok: false, denied: true, orders: [] };
  return { ok: true, orders: customerOrderBridge.listCustomerOrders(customerId, email) };
}

module.exports = {
  assertOwnOrder,
  getOwnOrder,
  listOwnOrders,
};
