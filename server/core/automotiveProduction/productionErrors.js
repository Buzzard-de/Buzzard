/**
 * Automotive Production Integration — structured error model.
 */
const PRODUCTION_ERRORS = Object.freeze({
  INTEGRATION_DISABLED: { code: "INTEGRATION_DISABLED", httpStatus: 403, retryable: false },
  SUPPLIER_DISABLED: { code: "SUPPLIER_DISABLED", httpStatus: 403, retryable: false },
  SUPPLIER_LIVE_DISABLED: { code: "SUPPLIER_LIVE_DISABLED", httpStatus: 403, retryable: false },
  TECDOC_DISABLED: { code: "TECDOC_DISABLED", httpStatus: 403, retryable: false },
  ORDER_LIVE_DISABLED: { code: "ORDER_LIVE_DISABLED", httpStatus: 403, retryable: false },
  SALES_DISABLED: { code: "SALES_DISABLED", httpStatus: 403, retryable: false },
  PUBLISH_DISABLED: { code: "PUBLISH_DISABLED", httpStatus: 403, retryable: false },
  INVALID_PRODUCT: { code: "INVALID_PRODUCT", httpStatus: 422, retryable: false },
  INVALID_IDENTITY: { code: "INVALID_IDENTITY", httpStatus: 422, retryable: false },
  INVALID_FITMENT: { code: "INVALID_FITMENT", httpStatus: 422, retryable: false },
  INVALID_CATEGORY: { code: "INVALID_CATEGORY", httpStatus: 422, retryable: false },
  IMAGE_INVALID: { code: "IMAGE_INVALID", httpStatus: 422, retryable: false },
  IMAGE_MISSING: { code: "IMAGE_MISSING", httpStatus: 422, retryable: false },
  TRANSLATION_MISSING: { code: "TRANSLATION_MISSING", httpStatus: 422, retryable: false },
  DUPLICATE_PRODUCT: { code: "DUPLICATE_PRODUCT", httpStatus: 409, retryable: false },
  STALE_STOCK: { code: "STALE_STOCK", httpStatus: 422, retryable: true },
  SUPPLIER_TIMEOUT: { code: "SUPPLIER_TIMEOUT", httpStatus: 504, retryable: true },
  SUPPLIER_RATE_LIMIT: { code: "SUPPLIER_RATE_LIMIT", httpStatus: 429, retryable: true },
  SUPPLIER_AUTH_FAILED: { code: "SUPPLIER_AUTH_FAILED", httpStatus: 401, retryable: false },
  TECDOC_TIMEOUT: { code: "TECDOC_TIMEOUT", httpStatus: 504, retryable: true },
  TECDOC_RATE_LIMIT: { code: "TECDOC_RATE_LIMIT", httpStatus: 429, retryable: true },
  ORDER_DUPLICATE: { code: "ORDER_DUPLICATE", httpStatus: 409, retryable: false },
  HUMAN_APPROVAL_REQUIRED: { code: "HUMAN_APPROVAL_REQUIRED", httpStatus: 403, retryable: false },
  CIRCUIT_OPEN: { code: "CIRCUIT_OPEN", httpStatus: 503, retryable: true },
  WEBHOOK_SIGNATURE_INVALID: { code: "WEBHOOK_SIGNATURE_INVALID", httpStatus: 401, retryable: false },
  STAGE_BLOCKED: { code: "STAGE_BLOCKED", httpStatus: 422, retryable: false },
});

function productionError(code, message, options = {}) {
  const def = PRODUCTION_ERRORS[code] || { code, httpStatus: 400, retryable: false };
  return {
    success: false,
    code: def.code,
    message: message || def.code,
    stage: options.stage || null,
    retryable: options.retryable ?? def.retryable,
    requiresHumanReview: Boolean(options.requiresHumanReview),
    details: options.details || {},
    httpStatus: def.httpStatus,
  };
}

module.exports = {
  PRODUCTION_ERRORS,
  productionError,
};
