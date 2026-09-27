/**
 * Unified exception bus. Does not auto-heal or fake success.
 */
const crypto = require("crypto");
const { db } = require("./db");

const TYPES = Object.freeze({
  PAYMENT_FAILED: "PAYMENT_FAILED",
  SUPPLIER_FAILED: "SUPPLIER_FAILED",
  STOCK_CHANGED: "STOCK_CHANGED",
  PRICE_CHANGED: "PRICE_CHANGED",
  ORDER_FAILED: "ORDER_FAILED",
  FULFILLMENT_FAILED: "FULFILLMENT_FAILED",
  TRACKING_FAILED: "TRACKING_FAILED",
  RETURN_FAILED: "RETURN_FAILED",
  REFUND_FAILED: "REFUND_FAILED",
  AI_ERROR: "AI_ERROR",
  PERMISSION_DENIED: "PERMISSION_DENIED",
  SECURITY_ALERT: "SECURITY_ALERT",
  DATA_INCONSISTENCY: "DATA_INCONSISTENCY",
  PRODUCT_SOT_LOCKED: "PRODUCT_SOT_LOCKED",
});

function emit({
  type,
  severity = "HIGH",
  source = "system",
  entity = null,
  entityId = null,
  correlationId = null,
  message,
  context = {},
  retryPolicy = "none",
  owner = null,
} = {}) {
  if (!type || !TYPES[type]) {
    throw new Error(`Unknown exception type: ${type}`);
  }
  const id = `ex_${crypto.randomBytes(8).toString("hex")}`;
  db.prepare(
    `
    INSERT INTO system_exceptions(
      id, type, severity, source, entity, entity_id, correlation_id,
      message, context_json, retry_policy, owner, status
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?, 'OPEN')
  `
  ).run(
    id,
    type,
    severity,
    source,
    entity,
    entityId,
    correlationId,
    message || type,
    JSON.stringify(context),
    retryPolicy,
    owner
  );
  return get(id);
}

function get(id) {
  return db.prepare("SELECT * FROM system_exceptions WHERE id = ?").get(id) || null;
}

function list({ status = "OPEN", limit = 50 } = {}) {
  return db
    .prepare("SELECT * FROM system_exceptions WHERE status = ? ORDER BY created_at DESC LIMIT ?")
    .all(status, limit);
}

module.exports = { TYPES, emit, get, list };
