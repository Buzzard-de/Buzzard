/**
 * Unified exception bus. Does not auto-heal or fake success.
 * While sales are closed, or the resolved database is the protected commerce
 * file, events stay in memory and SQLite is not opened.
 */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { redact } = require("./privacyRedact");

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

const events = [];

function salesAllowPersistence() {
  try {
    const { isSalesEnabled } = require("./salesMode");
    return isSalesEnabled() === true;
  } catch {
    return false;
  }
}

function canonicalCommercePath() {
  return path.resolve(__dirname, "..", "data", "buzzard.db");
}

function sameFile(left, right) {
  try {
    const a = fs.realpathSync(path.resolve(left));
    const b = fs.realpathSync(path.resolve(right));
    if (a === b) return true;
    const as = fs.statSync(a);
    const bs = fs.statSync(b);
    return as.ino === bs.ino && as.dev === bs.dev;
  } catch {
    return false;
  }
}

function brokenSymlink(file) {
  let stat;
  try {
    stat = fs.lstatSync(file);
  } catch (err) {
    return Boolean(err) && err.code !== "ENOENT";
  }
  if (!stat.isSymbolicLink()) return false;
  try {
    fs.realpathSync(file);
    return false;
  } catch {
    return true;
  }
}

function pathIsProtected(dbPath) {
  if (typeof dbPath !== "string" || !dbPath.trim() || dbPath.includes("\0")) return true;
  const resolved = path.resolve(dbPath.trim());
  const base = path.basename(resolved);
  if (!resolved || base.startsWith("buzzard_guardian") || base === "buzzard.db") return true;
  if (resolved.includes(`${path.sep}server${path.sep}data${path.sep}`)) return true;
  if (brokenSymlink(resolved)) return true;
  if (sameFile(resolved, canonicalCommercePath())) return true;
  return false;
}

function persistenceDecision() {
  if (!salesAllowPersistence()) return { persist: false, code: "SALES_CLOSED" };
  let selected;
  try {
    const { resolveDbPath } = require("./dbPaths");
    selected = resolveDbPath();
  } catch {
    return { persist: false, code: "EXCEPTION_DB_PATH_REFUSED" };
  }
  if (pathIsProtected(selected)) return { persist: false, code: "EXCEPTION_DB_PATH_REFUSED" };
  return { persist: true, code: null, path: selected };
}

function remember(record) {
  events.unshift(record);
  if (events.length > 400) events.pop();
  return record;
}

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
  const decision = persistenceDecision();
  const record = remember({
    id: `ex_${crypto.randomBytes(8).toString("hex")}`,
    type,
    severity,
    source,
    entity,
    entity_id: entityId,
    correlation_id: correlationId,
    message: message || type,
    context_json: JSON.stringify(redact(context)),
    retry_policy: retryPolicy,
    owner,
    status: "OPEN",
    retryable: retryable ? 1 : 0,
    stored: false,
    persisted: false,
    memory: true,
    code: decision.code,
  });
  try {
    require("./security/esatBey").watchException({ type, severity, source });
  } catch {
    /* Esat is additive and must not open the commerce database */
  }
  if (!decision.persist) return record;
  try {
    const { db } = require("./db");
    db.prepare(
      `
      INSERT INTO system_exceptions(
        id, type, severity, source, entity, entity_id, correlation_id,
        message, context_json, retry_policy, owner, status, retryable
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?, 'OPEN', ?)
    `
    ).run(
      record.id,
      record.type,
      record.severity,
      record.source,
      record.entity,
      record.entity_id,
      record.correlation_id,
      record.message,
      record.context_json,
      record.retry_policy,
      record.owner,
      record.retryable,
    );
    record.stored = true;
    record.persisted = true;
    record.code = null;
    return record;
  } catch {
    record.stored = false;
    record.persisted = false;
    record.code = "EXCEPTION_DB_WRITE_REFUSED";
    return record;
  }
}

function get(id) {
  return events.find((event) => event.id === id) || null;
}

function list({ status = "OPEN", limit = 50 } = {}) {
  const cap = Math.max(0, Number(limit) || 50);
  return events.filter((event) => event.status === status).slice(0, cap);
}

module.exports = { TYPES, emit, get, list };
