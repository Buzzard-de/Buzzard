/**
 * Automotive Production Integration — audit events (no secrets, no PII).
 */
const PII_FIELDS = new Set([
  "email", "phone", "address", "street", "city", "postalCode", "zip",
  "customerName", "firstName", "lastName", "password", "token", "apiKey", "secret",
]);

const SECRET_FIELDS = new Set([
  "apiKey", "apiSecret", "password", "token", "dsn", "secret", "authorization",
]);

const AUDIT_ACTIONS = Object.freeze([
  "PRODUCT_IMPORTED", "PRODUCT_NORMALIZED", "PRODUCT_MAPPED", "PRODUCT_VALIDATED",
  "PRODUCT_REVIEW_REQUIRED", "PRODUCT_APPROVED", "PRODUCT_PUBLISHED",
  "SUPPLIER_SYNC_STARTED", "SUPPLIER_SYNC_COMPLETED", "PRICE_UPDATED", "STOCK_UPDATED",
  "ORDER_CREATED", "SUPPLIER_ORDER_CREATED", "SHIPMENT_CREATED", "TRACKING_UPDATED",
  "RETURN_CREATED",
]);

const _entries = [];

function sanitizeMetadata(meta = {}) {
  const out = {};
  for (const [key, value] of Object.entries(meta)) {
    const lower = key.toLowerCase();
    if (PII_FIELDS.has(key) || SECRET_FIELDS.has(key)) continue;
    if (lower.includes("password") || lower.includes("secret") || lower.includes("token")) continue;
    if (typeof value === "object" && value !== null) {
      out[key] = sanitizeMetadata(value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

function recordIntegrationAudit(event = {}) {
  const record = {
    timestamp: new Date().toISOString(),
    actor: event.actor || "system",
    source: event.source || "automotive_production",
    entityId: event.entityId || null,
    action: event.action || "UNKNOWN",
    result: event.result || "OK",
    metadata: sanitizeMetadata(event.metadata || {}),
    requestId: event.requestId || null,
    correlationId: event.correlationId || null,
    supplierId: event.supplierId || null,
    operation: event.operation || null,
  };
  _entries.unshift(record);
  if (_entries.length > 10000) _entries.length = 10000;
  return record;
}

function listIntegrationAudit(filters = {}) {
  let rows = [..._entries];
  if (filters.action) rows = rows.filter((r) => r.action === filters.action);
  if (filters.supplierId) rows = rows.filter((r) => r.supplierId === filters.supplierId);
  if (filters.limit) rows = rows.slice(0, filters.limit);
  return rows;
}

function clearIntegrationAudit() {
  _entries.length = 0;
}

module.exports = {
  AUDIT_ACTIONS,
  recordIntegrationAudit,
  listIntegrationAudit,
  clearIntegrationAudit,
  sanitizeMetadata,
};
