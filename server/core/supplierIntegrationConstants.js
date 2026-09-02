/**
 * Part 23 — Supplier integration readiness constants.
 */
const SUPPLIER_CAPABILITY = Object.freeze({
  CATALOG: "catalog",
  PRICE: "price",
  STOCK: "stock",
  GTIN: "gtin",
  MPN: "mpn",
  BRAND: "brand",
  IMAGES: "images",
  CATEGORIES: "categories",
  ORDERS: "orders",
  SHIPPING: "shipping",
  TRACKING: "tracking",
  DROPSHIPPING: "dropshipping",
  WHITE_LABEL: "whiteLabel",
  API: "api",
  XML: "xml",
  CSV: "csv",
});

const SUPPLIER_ADAPTER_FORMAT = Object.freeze({
  API: "api",
  XML: "xml",
  CSV: "csv",
  JSON: "json",
  MOCK: "mock",
});

const SUPPLIER_READINESS_STATUS = Object.freeze({
  PASS: "PASS",
  FAIL: "FAIL",
  BLOCKED: "BLOCKED",
  CONDITION: "CONDITION",
  UNKNOWN: "UNKNOWN",
});

const SUPPLIER_ERROR_CODE = Object.freeze({
  SUPPLIER_UNAVAILABLE: "supplierUnavailable",
  AUTHENTICATION_FAILED: "authenticationFailed",
  RATE_LIMITED: "rateLimited",
  FEED_INVALID: "feedInvalid",
  MAPPING_FAILED: "mappingFailed",
  VALIDATION_FAILED: "validationFailed",
  DUPLICATE_DETECTED: "duplicateDetected",
  TIMEOUT: "timeout",
  CONFIGURATION_MISSING: "configurationMissing",
  LIVE_IMPORT_BLOCKED: "liveImportBlocked",
  SUPPLIER_ORDER_BLOCKED: "supplierOrderBlocked",
  NETWORK_BLOCKED: "networkBlocked",
});

const RETRYABLE_ERRORS = new Set([
  SUPPLIER_ERROR_CODE.SUPPLIER_UNAVAILABLE,
  SUPPLIER_ERROR_CODE.RATE_LIMITED,
  SUPPLIER_ERROR_CODE.TIMEOUT,
]);

const DROPSHIP_CAPABILITIES = Object.freeze({
  DROPSHIPPING: "dropshipping",
  WHITE_LABEL: "whiteLabel",
  BLIND_SHIPPING: "blindShipping",
  CUSTOM_PACKAGING: "customPackaging",
});

module.exports = {
  SUPPLIER_CAPABILITY,
  SUPPLIER_ADAPTER_FORMAT,
  SUPPLIER_READINESS_STATUS,
  SUPPLIER_ERROR_CODE,
  RETRYABLE_ERRORS,
  DROPSHIP_CAPABILITIES,
};
