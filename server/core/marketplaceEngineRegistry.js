/**
 * Server-side Marketplace Engine mirror — credentials and listing fields are server-controlled.
 */
const SERVER_ONLY_FIELDS = new Set([
  "marketplaceListingId",
  "listingId",
  "marketplacePrice",
  "marketplaceStock",
  "price",
  "stock",
  "orderId",
  "orderMapping",
  "connectorStatus",
  "status",
  "credentials",
  "apiKey",
  "apiSecret",
  "accessToken",
  "refreshToken",
  "webhookSecret",
  "payloadHash",
]);

const SECRET_PATTERN = /api[_-]?key|secret|password|token|authorization|bearer|credential/i;

function rejectClientMarketplaceModification(body = {}) {
  for (const key of Object.keys(body)) {
    if (SECRET_PATTERN.test(key)) {
      return { allowed: false, reason: "CREDENTIALS_NOT_ALLOWED_ON_CLIENT" };
    }
    if (SERVER_ONLY_FIELDS.has(key)) {
      return { allowed: false, reason: "MARKETPLACE_FIELDS_NOT_CLIENT_WRITABLE" };
    }
  }
  return { allowed: true };
}

function sanitizeClientMarketplacePatch(existing = {}, patch = {}) {
  const sanitized = { ...existing };
  for (const key of Object.keys(patch)) {
    if (!SERVER_ONLY_FIELDS.has(key)) {
      sanitized[key] = patch[key];
    }
  }
  return sanitized;
}

function redactMarketplaceSecrets(obj = {}) {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SECRET_PATTERN.test(key)) {
      result[key] = "[REDACTED]";
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      result[key] = redactMarketplaceSecrets(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

module.exports = {
  rejectClientMarketplaceModification,
  sanitizeClientMarketplacePatch,
  redactMarketplaceSecrets,
};
