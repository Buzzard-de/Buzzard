/**
 * Server-side Supplier Engine mirror — credentials and sync validation.
 */
const { normalizeSupplierProductRecord } = require("../lib/pim/supplierProductNormalizer");
const { createSupplierError, shouldRetry } = require("../lib/supplier/supplierErrors");
const SECRET_PATTERN = /api[_-]?key|secret|password|token|authorization|bearer|credential/i;

function redactSecrets(obj) {
  if (obj == null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(redactSecrets);
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SECRET_PATTERN.test(key)) {
      result[key] = "[REDACTED]";
    } else if (typeof value === "object") {
      result[key] = redactSecrets(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function validateSyncRequest(body = {}, principal = "client") {
  if (principal === "client") {
    for (const key of Object.keys(body)) {
      if (SECRET_PATTERN.test(key)) {
        return { allowed: false, reason: "CREDENTIALS_NOT_ALLOWED_ON_CLIENT" };
      }
    }
    if (body.supplierPrice != null || body.supplierStock != null) {
      return { allowed: false, reason: "COMMERCIAL_FIELDS_NOT_CLIENT_WRITABLE" };
    }
  }
  return { allowed: true };
}

function normalizeSupplierFeedRecord(raw, { supplierId, sourceProductId } = {}) {
  return normalizeSupplierProductRecord(raw, {
    supplierCode: supplierId,
    sourceProductId,
  });
}

function validateSupplierId(supplierId, knownSuppliers = []) {
  if (!supplierId) return { valid: false, reason: "SUPPLIER_ID_MISSING" };
  if (knownSuppliers.length && !knownSuppliers.includes(supplierId)) {
    return { valid: false, reason: "UNKNOWN_SUPPLIER" };
  }
  return { valid: true };
}

function wrapSyncError(err, supplierId) {
  return createSupplierError(err?.code || "SUPPLIER_UNAVAILABLE", {
    message: err?.message,
    supplierId,
    details: redactSecrets(err?.details || {}),
  });
}

module.exports = {
  validateSyncRequest,
  normalizeSupplierFeedRecord,
  validateSupplierId,
  wrapSyncError,
  shouldRetry,
  redactSecrets,
};
