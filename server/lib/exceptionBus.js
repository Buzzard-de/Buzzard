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
  PRODUCT_IDENTITY_CONFLICT: "PRODUCT_IDENTITY_CONFLICT",
  PRODUCT_SOT_CONFLICT: "PRODUCT_SOT_CONFLICT",
  PRODUCT_WRITE_BLOCKED: "PRODUCT_WRITE_BLOCKED",
  INVENTORY_CONFLICT: "INVENTORY_CONFLICT",
  PRICE_CONFLICT: "PRICE_CONFLICT",
  CART_STOCK_CONFLICT: "CART_STOCK_CONFLICT",
  CHECKOUT_VALIDATION_FAILED: "CHECKOUT_VALIDATION_FAILED",
  ORDER_PREPARATION_FAILED: "ORDER_PREPARATION_FAILED",
  PRODUCT_NOT_FOUND: "PRODUCT_NOT_FOUND",
  PRICE_INVALID: "PRICE_INVALID",
  INVENTORY_INSUFFICIENT: "INVENTORY_INSUFFICIENT",
  INVENTORY_RESERVATION_CONFLICT: "INVENTORY_RESERVATION_CONFLICT",
  CHECKOUT_INVALID: "CHECKOUT_INVALID",
  ORDER_IDEMPOTENCY_CONFLICT: "ORDER_IDEMPOTENCY_CONFLICT",
  PAYMENT_NOT_LIVE: "PAYMENT_NOT_LIVE",
  SUPPLIER_NOT_LIVE: "SUPPLIER_NOT_LIVE",
  FULFILLMENT_NOT_LIVE: "FULFILLMENT_NOT_LIVE",
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
  retryable = false,
} = {}) {
  if (!type || !TYPES[type]) {
    throw new Error(`Unknown exception type: ${type}`);
  }
  const id = `ex_${crypto.randomBytes(8).toString("hex")}`;
  db.prepare(
    `
    INSERT INTO system_exceptions(
      id, type, severity, source, entity, entity_id, correlation_id,
      message, context_json, retry_policy, owner, status, retryable
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?, 'OPEN', ?)
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
    owner,
    retryable ? 1 : 0
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
