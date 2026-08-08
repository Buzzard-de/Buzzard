const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const notificationEngine = require("./notificationEngine");

const dataDir = path.join(__dirname, "..", "data");
const eventsFile = path.join(dataDir, "automation-events.json");
const deliveriesFile = path.join(dataDir, "automation-deliveries.json");

const EVENT_TYPES = new Set([
  "new_order",
  "payment_confirmed",
  "order_shipped",
  "order_delivered",
  "low_stock",
  "supplier_stock_update",
  "supplier_import_failure",
  "abandoned_cart",
  "new_customer",
  "return_request",
  "refund",
  "review_request",
]);

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
}

function readJson(file, fallback) {
  ensureDataDir();
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8") || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  ensureDataDir();
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}

function readEvents() {
  return readJson(eventsFile, []);
}

function writeEvents(events) {
  writeJson(eventsFile, events);
}

function readDeliveries() {
  return readJson(deliveriesFile, []);
}

function writeDeliveries(deliveries) {
  writeJson(deliveriesFile, deliveries);
}

function buildIdempotencyKey(eventType, payload, explicitKey) {
  if (explicitKey) return `${eventType}:${explicitKey}`;
  const parts = [
    payload.orderNumber,
    payload.customerId,
    payload.email,
    payload.productId,
    payload.shipmentId,
    payload.returnId,
    payload.cartId,
  ].filter(Boolean);
  return `${eventType}:${parts.join(":") || crypto.randomUUID()}`;
}

function wasDelivered(idempotencyKey) {
  return readDeliveries().some((d) => d.key === idempotencyKey);
}

function markDelivered(idempotencyKey, eventId) {
  const deliveries = readDeliveries();
  if (deliveries.some((d) => d.key === idempotencyKey)) return;
  deliveries.push({ key: idempotencyKey, eventId, at: new Date().toISOString() });
  writeDeliveries(deliveries.slice(-5000));
}

function emit(eventType, payload = {}, options = {}) {
  if (!EVENT_TYPES.has(eventType)) {
    return { ok: false, error: "unknown_event_type" };
  }

  const idempotencyKey = buildIdempotencyKey(eventType, payload, options.idempotencyKey);
  if (wasDelivered(idempotencyKey) && options.idempotent !== false) {
    return { ok: true, duplicate: true, idempotencyKey };
  }

  const event = {
    id: crypto.randomUUID(),
    type: eventType,
    payload,
    idempotencyKey,
    createdAt: new Date().toISOString(),
    status: "pending",
  };

  const events = readEvents();
  events.push(event);
  writeEvents(events.slice(-2000));

  try {
    const notificationResult = notificationEngine.handleAutomationEvent(event);
    event.status = "processed";
    event.processedAt = new Date().toISOString();
    event.notification = notificationResult;
    markDelivered(idempotencyKey, event.id);
  } catch (err) {
    event.status = "failed";
    event.error = String(err.message || err);
  }

  const updated = readEvents();
  const idx = updated.findIndex((e) => e.id === event.id);
  if (idx >= 0) {
    updated[idx] = event;
    writeEvents(updated.slice(-2000));
  }

  return { ok: true, event, duplicate: false };
}

function listEvents(filters = {}) {
  let events = readEvents().slice().reverse();
  if (filters.type) events = events.filter((e) => e.type === filters.type);
  if (filters.limit) events = events.slice(0, filters.limit);
  return events;
}

function getStats() {
  const events = readEvents();
  const byType = {};
  for (const event of events) {
    byType[event.type] = (byType[event.type] || 0) + 1;
  }
  return {
    total: events.length,
    byType,
    deliveries: readDeliveries().length,
  };
}

module.exports = {
  EVENT_TYPES,
  emit,
  listEvents,
  getStats,
  readEvents,
};
