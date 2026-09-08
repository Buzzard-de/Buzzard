/**
 * Structured automotive core error codes.
 */
const AUTOMOTIVE_ERRORS = Object.freeze({
  AUTOMOTIVE_CATEGORY_INVALID: { code: "AUTOMOTIVE_CATEGORY_INVALID", httpStatus: 400 },
  AUTOMOTIVE_MAPPING_UNCERTAIN: { code: "AUTOMOTIVE_MAPPING_UNCERTAIN", httpStatus: 422 },
  AUTOMOTIVE_GTIN_INVALID: { code: "AUTOMOTIVE_GTIN_INVALID", httpStatus: 422 },
  AUTOMOTIVE_MPN_MISSING: { code: "AUTOMOTIVE_MPN_MISSING", httpStatus: 422 },
  AUTOMOTIVE_FITMENT_INVALID: { code: "AUTOMOTIVE_FITMENT_INVALID", httpStatus: 422 },
  AUTOMOTIVE_FITMENT_UNCERTAIN: { code: "AUTOMOTIVE_FITMENT_UNCERTAIN", httpStatus: 422 },
  AUTOMOTIVE_IMAGE_MISSING: { code: "AUTOMOTIVE_IMAGE_MISSING", httpStatus: 422 },
  AUTOMOTIVE_IMAGE_UNSAFE: { code: "AUTOMOTIVE_IMAGE_UNSAFE", httpStatus: 422 },
  AUTOMOTIVE_TRANSLATION_MISSING: { code: "AUTOMOTIVE_TRANSLATION_MISSING", httpStatus: 422 },
  AUTOMOTIVE_SEO_INVALID: { code: "AUTOMOTIVE_SEO_INVALID", httpStatus: 422 },
  AUTOMOTIVE_DUPLICATE: { code: "AUTOMOTIVE_DUPLICATE", httpStatus: 409 },
  AUTOMOTIVE_SUPPLIER_UNAVAILABLE: { code: "AUTOMOTIVE_SUPPLIER_UNAVAILABLE", httpStatus: 503 },
  AUTOMOTIVE_PRICE_INVALID: { code: "AUTOMOTIVE_PRICE_INVALID", httpStatus: 422 },
  AUTOMOTIVE_STOCK_UNKNOWN: { code: "AUTOMOTIVE_STOCK_UNKNOWN", httpStatus: 422 },
  AUTOMOTIVE_PUBLISH_BLOCKED: { code: "AUTOMOTIVE_PUBLISH_BLOCKED", httpStatus: 403 },
  AUTOMOTIVE_LIVE_DISABLED: { code: "AUTOMOTIVE_LIVE_DISABLED", httpStatus: 403 },
});

function automotiveError(key, message, details = {}) {
  const def = AUTOMOTIVE_ERRORS[key] || { code: key, httpStatus: 400 };
  return {
    success: false,
    errorKey: def.code,
    message: message || def.code,
    details,
    httpStatus: def.httpStatus,
  };
}

module.exports = {
  AUTOMOTIVE_ERRORS,
  automotiveError,
};
