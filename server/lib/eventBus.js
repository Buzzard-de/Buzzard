/**
 * In-process event bus. Idempotent by event_id. Not a fake external broker.
 */
const crypto = require("crypto");
const { db } = require("./db");
const { redact } = require("./privacyRedact");

const TYPES = Object.freeze({
  ProductCreated: "ProductCreated",
  ProductUpdated: "ProductUpdated",
  ProductArchived: "ProductArchived",
  InventoryUpdated: "InventoryUpdated",
  PriceUpdated: "PriceUpdated",
  CartCreated: "CartCreated",
  CartUpdated: "CartUpdated",
  OrderPrepared: "OrderPrepared",
  ProductResolved: "ProductResolved",
  InventoryChecked: "InventoryChecked",
  PriceResolved: "PriceResolved",
  CheckoutValidated: "CheckoutValidated",
  OrderCreated: "OrderCreated",
});

const listeners = new Map();

function on(type, handler) {
  if (!listeners.has(type)) listeners.set(type, []);
  listeners.get(type).push(handler);
}

function emit({
  type,
  payload = {},
  correlationId = null,
  idempotencyKey = null,
  aggregateId = null,
  aggregateType = null,
  version = 1,
  timeout = false,
  networkError = false,
} = {}) {
  if (!type) throw new Error("event type required");
  const id = idempotencyKey || `evt_${crypto.randomBytes(8).toString("hex")}`;
  const safePayload = redact(payload);
  const existing = db.prepare("SELECT id FROM system_events WHERE id = ?").get(id);
  if (existing) {
    return {
      id,
      duplicate: true,
      type,
      aggregateId,
      aggregateType,
      version,
      stored: false,
      sent: false,
      customerNotified: false,
      live: false,
      commercial: false,
      status: "UNKNOWN",
    };
  }
  const timedOut = timeout === true;
  const network = networkError === true;
  db.prepare(
    `
    INSERT INTO system_events(id, type, payload_json, correlation_id, aggregate_id, aggregate_type, version)
    VALUES (?,?,?,?,?,?,?)
  `
  ).run(
    id,
    type,
    JSON.stringify({ ...safePayload, commercial: false, customerNotified: false }),
    correlationId,
    aggregateId,
    aggregateType,
    version
  );
  const event = { id, type, payload: safePayload, correlationId, aggregateId, aggregateType, version, commercial: false };
  const handlers = listeners.get(type) || [];
  for (const handler of handlers) {
    try {
      handler(event);
    } catch {
      /* handlers must not break emit */
    }
  }
  return {
    id,
    duplicate: false,
    type,
    aggregateId,
    aggregateType,
    version,
    stored: true,
    sent: false,
    customerNotified: false,
    live: false,
    commercial: false,
    status: timedOut || network ? "FAILED" : "UNKNOWN",
    code: timedOut ? "TIMEOUT" : network ? "NETWORK_ERROR" : "IN_PROCESS_EVENT",
  };
}

module.exports = { TYPES, on, emit };
