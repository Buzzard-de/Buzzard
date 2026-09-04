/**
 * Part 23 — Standard supplier error model with retry/idempotency hints.
 */
const crypto = require("crypto");
const {
  SUPPLIER_ERROR_CODE,
  RETRYABLE_ERRORS,
} = require("../../core/supplierIntegrationConstants");
const { redactSecrets } = require("./realSupplierConnector");

function createSupplierError(code, { message, details = null, supplierId = null } = {}) {
  const normalized = Object.values(SUPPLIER_ERROR_CODE).includes(code)
    ? code
    : SUPPLIER_ERROR_CODE.SUPPLIER_UNAVAILABLE;

  return {
    ok: false,
    code: normalized,
    message: message || normalized,
    supplierId,
    retryable: RETRYABLE_ERRORS.has(normalized),
    details: details ? redactSecrets(details) : null,
    timestamp: new Date().toISOString(),
  };
}

function wrapError(err, supplierId) {
  if (err?.code && Object.values(SUPPLIER_ERROR_CODE).includes(err.code)) {
    return createSupplierError(err.code, {
      message: err.message,
      details: err.details,
      supplierId,
    });
  }
  return createSupplierError(SUPPLIER_ERROR_CODE.SUPPLIER_UNAVAILABLE, {
    message: err?.message || "Unknown supplier error",
    supplierId,
  });
}

function buildIdempotencyKey({ supplierId, action, payload = {} }) {
  const hash = crypto
    .createHash("sha256")
    .update(JSON.stringify({ supplierId, action, payload }))
    .digest("hex")
    .slice(0, 16);
  return `sup_${supplierId || "unknown"}_${action}_${hash}`;
}

function shouldRetry(error, attempt = 1, maxAttempts = 3) {
  if (!error?.retryable) return false;
  return attempt < maxAttempts;
}

module.exports = {
  createSupplierError,
  wrapError,
  buildIdempotencyKey,
  shouldRetry,
  SUPPLIER_ERROR_CODE,
};
