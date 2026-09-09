/**
 * Server-side Pricing Engine mirror — validates pricing requests and blocks client writes.
 */
const { getVatContext } = require("./marketEngineRegistry");

const SERVER_ONLY_FIELDS = new Set([
  "supplierCost",
  "supplierPrice",
  "supplierNetPrice",
  "shippingCost",
  "marketplaceFee",
  "paymentFee",
  "returnCostReserve",
  "refundCostReserve",
  "returnReserve",
  "targetMargin",
  "targetMarginPercent",
  "minimumMarginPercent",
  "calculatedPrice",
  "customerNetPrice",
  "customerGrossPrice",
  "customerVat",
  "margin",
  "buzzardContributionMargin",
]);

const SECRET_PATTERN = /api[_-]?key|secret|password|token|authorization|bearer|credential/i;

function rejectClientPricingModification(body = {}) {
  for (const key of Object.keys(body)) {
    if (SECRET_PATTERN.test(key)) {
      return { allowed: false, reason: "CREDENTIALS_NOT_ALLOWED_ON_CLIENT" };
    }
    if (SERVER_ONLY_FIELDS.has(key)) {
      return { allowed: false, reason: "PRICING_FIELDS_NOT_CLIENT_WRITABLE" };
    }
  }
  return { allowed: true };
}

function validatePricingRequest(input = {}) {
  if (!input.productId?.trim()) return { valid: false, reason: "PRODUCT_ID_MISSING" };
  if (!input.supplierId?.trim()) return { valid: false, reason: "SUPPLIER_ID_MISSING" };
  if (!input.marketId?.trim()) return { valid: false, reason: "MARKET_ID_MISSING" };
  if (!input.channel?.trim()) return { valid: false, reason: "CHANNEL_MISSING" };
  return { valid: true };
}

function sanitizeClientPricingPatch(existing = {}, patch = {}) {
  const sanitized = { ...existing };
  for (const key of Object.keys(patch)) {
    if (!SERVER_ONLY_FIELDS.has(key)) {
      sanitized[key] = patch[key];
    }
  }
  return sanitized;
}

function redactPricingSecrets(obj) {
  if (obj == null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(redactPricingSecrets);
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SECRET_PATTERN.test(key)) {
      result[key] = "[REDACTED]";
    } else if (typeof value === "object") {
      result[key] = redactPricingSecrets(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/** Server-side margin validation — contribution margin on revenue. */
function validateMinimumMargin(totalVariableCost, customerNetPrice, minimumMarginPercent = 0.05) {
  if (customerNetPrice <= 0) return { valid: false, reason: "INVALID_PRICE" };
  const margin = (customerNetPrice - totalVariableCost) / customerNetPrice;
  if (margin < minimumMarginPercent) {
    return { valid: false, reason: "BELOW_MINIMUM_MARGIN", margin };
  }
  return { valid: true, margin };
}

module.exports = {
  rejectClientPricingModification,
  validatePricingRequest,
  sanitizeClientPricingPatch,
  redactPricingSecrets,
  validateMinimumMargin,
  getVatContext,
};
