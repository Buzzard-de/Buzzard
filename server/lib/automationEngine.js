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
  const admission = require("./notificationAdmission");
  if (!EVENT_TYPES.has(eventType)) {
    return {
      ok: false,
      error: "unknown_event_type",
      code: "UNKNOWN_EVENT",
      sent: false,
      executed: false,
      dryRun: true,
      providerCalled: false,
    };
  }

  const channel = options.channel || payload.channel || "email";
  let decision = admission.decideNotification({
    eventType,
    channel,
    consent: options.consent,
    transaction: options.transaction,
    operational: options.operational,
    approval: options.approval,
    jobId: options.jobId,
    aiInitiated: options.origin === "ai" || options.ai === true,
  });
  const shouldHold = decision.kind === "operational" && decision.code === "APPROVAL_REQUIRED" && (options.deps || options.bindApproval === true);
  if (shouldHold && options.isolate === true && options.deps) {
    decision = admission.holdOperationalNotice({
      eventType,
      channel,
      operational: options.operational,
      actor: options.actor || (options.origin === "ai" ? "ai_notification" : "automation_engine"),
      subjectId: options.subjectId || payload.supplierId || payload.productId || null,
      deps: options.deps,
      aiInitiated: options.origin === "ai" || options.ai === true,
      jobId: options.jobId,
      approval: options.approval,
    });
  } else if (shouldHold && options.isolate !== true) {
    const deps = options.deps || require("./controlCenterJobAdmission").peripheralDeps();
    decision = admission.holdOperationalNotice({
      eventType,
      channel,
      operational: options.operational,
      actor: options.actor || (options.origin === "ai" ? "ai_notification" : "automation_engine"),
      subjectId: options.subjectId || payload.supplierId || payload.productId || null,
      deps,
      aiInitiated: options.origin === "ai" || options.ai === true,
      jobId: options.jobId,
      approval: options.approval,
    });
  }

  const event = {
    id: crypto.randomUUID(),
    type: eventType,
    idempotencyKey: buildIdempotencyKey(eventType, payload, options.idempotencyKey),
    createdAt: new Date().toISOString(),
    status: decision.pendingApproval ? "approval_required" : decision.ok ? "dry_run" : "refused",
    code: decision.code,
    kind: decision.kind,
    channel: decision.channel,
    dryRun: true,
    sent: false,
    executed: false,
    providerCalled: false,
  };
  if (options.isolate === true) {
    if (typeof options.record === "function") options.record(event);
  } else {
    const events = readEvents();
    events.push(event);
    writeEvents(events.slice(-2000));
  }

  return {
    ok: Boolean(decision.ok || decision.pendingApproval),
    duplicate: false,
    event,
    ...decision,
    sent: false,
    executed: false,
    dryRun: true,
    providerCalled: false,
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
