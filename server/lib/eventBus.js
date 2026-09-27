/**
 * In-process event bus. Idempotent by event_id. Not a fake external broker.
 */
const crypto = require("crypto");
const { db } = require("./db");

const TYPES = Object.freeze({
  ProductCreated: "ProductCreated",
  ProductUpdated: "ProductUpdated",
  ProductArchived: "ProductArchived",
  InventoryUpdated: "InventoryUpdated",
  PriceUpdated: "PriceUpdated",
  CartCreated: "CartCreated",
  CartUpdated: "CartUpdated",
  OrderPrepared: "OrderPrepared",
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
} = {}) {
  if (!type) throw new Error("event type required");
  const id = idempotencyKey || `evt_${crypto.randomBytes(8).toString("hex")}`;
  const existing = db.prepare("SELECT id FROM system_events WHERE id = ?").get(id);
  if (existing) {
    return { id, duplicate: true, type };
  }
  db.prepare(
    `
    INSERT INTO system_events(id, type, payload_json, correlation_id, aggregate_id, aggregate_type, version)
    VALUES (?,?,?,?,?,?,?)
  `
  ).run(id, type, JSON.stringify(payload), correlationId, aggregateId, aggregateType, version);
  const event = { id, type, payload, correlationId, aggregateId, aggregateType, version };
  const handlers = listeners.get(type) || [];
  for (const handler of handlers) {
    try {
      handler(event);
    } catch {
      /* handlers must not break emit */
    }
  }
  return { id, duplicate: false, type, aggregateId, aggregateType, version };
}

module.exports = { TYPES, on, emit };
