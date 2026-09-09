/**
 * Server-side Order Engine mirror — order and payment fields are server-controlled.
 */
const SERVER_ONLY_FIELDS = new Set([
  "supplierCostSnapshot",
  "supplierId",
  "supplierOfferId",
  "marginSnapshot",
  "priceSnapshot",
  "priceSnapshotId",
  "paymentStatus",
  "orderStatus",
  "status",
  "inventoryReservationId",
  "inventoryReservation",
  "supplierOrderStatus",
  "marketplaceFeeSnapshot",
  "paymentFeeSnapshot",
  "returnReserveSnapshot",
]);

const SECRET_PATTERN = /api[_-]?key|secret|password|token|authorization|bearer|credential|cvv|card/i;

function rejectClientOrderModification(body = {}) {
  for (const key of Object.keys(body)) {
    if (SECRET_PATTERN.test(key)) {
      return { allowed: false, reason: "CREDENTIALS_NOT_ALLOWED_ON_CLIENT" };
    }
    if (SERVER_ONLY_FIELDS.has(key)) {
      return { allowed: false, reason: "ORDER_FIELDS_NOT_CLIENT_WRITABLE" };
    }
  }
  return { allowed: true };
}

function canCustomerAccessOrder(orderCustomerId, requestCustomerId) {
  return orderCustomerId === requestCustomerId;
}

function validateOrderAccess(order, requestCustomerId) {
  if (!order) return { allowed: false, reason: "ORDER_NOT_FOUND" };
  if (!canCustomerAccessOrder(order.customerId, requestCustomerId)) {
    return { allowed: false, reason: "UNAUTHORIZED" };
  }
  return { allowed: true };
}

function sanitizeClientOrderPatch(existing = {}, patch = {}) {
  const sanitized = { ...existing };
  for (const key of Object.keys(patch)) {
    if (!SERVER_ONLY_FIELDS.has(key)) {
      sanitized[key] = patch[key];
    }
  }
  return sanitized;
}

module.exports = {
  rejectClientOrderModification,
  canCustomerAccessOrder,
  validateOrderAccess,
  sanitizeClientOrderPatch,
};
