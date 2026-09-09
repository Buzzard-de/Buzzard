/**
 * Server-side Inventory Engine mirror — stock fields are server-controlled.
 */
const SERVER_ONLY_FIELDS = new Set([
  "supplierQuantity",
  "quantity",
  "availableQuantity",
  "saleableQuantity",
  "reservedQuantity",
  "stockStatus",
  "supplierLastUpdatedAt",
  "lastSuccessfulSync",
  "lastSuccessfulSyncAt",
  "lastSyncedAt",
  "stockBuffer",
  "marketAvailability",
  "channelAvailability",
  "isStale",
]);

const SECRET_PATTERN = /api[_-]?key|secret|password|token|authorization|bearer|credential/i;

function rejectClientInventoryModification(body = {}) {
  for (const key of Object.keys(body)) {
    if (SECRET_PATTERN.test(key)) {
      return { allowed: false, reason: "CREDENTIALS_NOT_ALLOWED_ON_CLIENT" };
    }
    if (SERVER_ONLY_FIELDS.has(key)) {
      return { allowed: false, reason: "INVENTORY_FIELDS_NOT_CLIENT_WRITABLE" };
    }
  }
  return { allowed: true };
}

function validateInventoryRequest(input = {}) {
  if (!input.productId?.trim()) return { valid: false, reason: "PRODUCT_ID_MISSING" };
  if (!input.supplierId?.trim()) return { valid: false, reason: "SUPPLIER_ID_MISSING" };
  if (!input.supplierOfferId?.trim()) return { valid: false, reason: "SUPPLIER_OFFER_ID_MISSING" };
  if (input.quantity != null && (input.quantity < 0 || !Number.isFinite(input.quantity))) {
    return { valid: false, reason: "INVALID_QUANTITY" };
  }
  return { valid: true };
}

function sanitizeClientInventoryPatch(existing = {}, patch = {}) {
  const sanitized = { ...existing };
  for (const key of Object.keys(patch)) {
    if (!SERVER_ONLY_FIELDS.has(key)) {
      sanitized[key] = patch[key];
    }
  }
  return sanitized;
}

function validateSupplierQuantity(rawQuantity) {
  if (rawQuantity == null || rawQuantity === "") {
    return { valid: false, stockStatus: "UNKNOWN", errors: ["MISSING_STOCK"] };
  }
  const parsed = Number(rawQuantity);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return { valid: false, stockStatus: "UNKNOWN", errors: ["INVALID_STOCK"] };
  }
  return { valid: true, normalizedQuantity: Math.floor(parsed), stockStatus: parsed > 0 ? "IN_STOCK" : "OUT_OF_STOCK", errors: [] };
}

function calculateSaleableQuantity(availableQuantity, bufferValue, reservedQuantity = 0) {
  const afterBuffer = Math.max(0, availableQuantity - bufferValue);
  return Math.max(0, afterBuffer - reservedQuantity);
}

module.exports = {
  rejectClientInventoryModification,
  validateInventoryRequest,
  sanitizeClientInventoryPatch,
  validateSupplierQuantity,
  calculateSaleableQuantity,
};
