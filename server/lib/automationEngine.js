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
  const notice = notificationEngine.handleAutomationEvent({
    id: idempotencyKey,
    type: eventType,
    payload: {
      language: payload.language || payload.locale || null,
      channel: payload.channel || "email",
      orderNumber: payload.orderNumber || null,
      marketingConsent: payload.marketingConsent === true,
      unsubscribed: payload.unsubscribed === true,
      mock: payload.mock === true,
      timeout: payload.timeout === true,
      networkError: payload.networkError === true,
    },
    idempotencyKey,
  });
  return {
    ok: false,
    sent: false,
    queued: false,
    duplicate: notice.duplicate === true || (wasDelivered(idempotencyKey) && options.idempotent !== false),
    idempotencyKey,
    customerNotified: false,
    live: false,
    event: {
      id: idempotencyKey,
      type: eventType,
      status: notice.status || "UNKNOWN",
      notification: notice,
    },
  };
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
