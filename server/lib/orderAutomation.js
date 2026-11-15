const crypto = require("crypto");
const { db } = require("./db");

function isEnabled() {
  return process.env.BUZZARD_ORDER_AUTOMATION !== "0" && process.env.BUZZARD_DB_ENABLED !== "0";
}

function defaultPaymentProvider() {
  return process.env.DEFAULT_PAYMENT_PROVIDER || "stripe";
}

function defaultCarrier() {
  return process.env.DEFAULT_CARRIER || "dhl";
}

const CLAIMED_EVENT_STATUSES = new Set([
  "sent",
  "delivered",
  "paid",
  "confirmed",
  "submitted",
  "shipped",
  "refunded",
  "queued",
  "delivery_confirmed",
  "submitted_confirmed",
  "succeeded",
  "captured",
]);

function recordEvent(type, orderNumber, provider, status, payload = {}) {
  const reported = status == null ? "" : String(status).trim().toLowerCase();
  if (!reported || CLAIMED_EVENT_STATUSES.has(reported)) {
    return {
      ok: false,
      stored: false,
      code: reported ? "EVENT_UNVERIFIED" : "UNKNOWN",
      reportedStatus: reported || null,
      live: false,
    };
  }
  const eventKey = crypto
    .createHash("sha256")
    .update(JSON.stringify({ type, orderNumber, provider, status, payload }))
    .digest("hex");
  db.prepare(`
    INSERT OR IGNORE INTO integration_events(event_key, type, order_number, provider, status, payload)
    VALUES(?,?,?,?,?,?)
  `).run(eventKey, type, orderNumber || null, provider || null, status, JSON.stringify(payload));
  return { ok: true, stored: true, eventKey, claimed: false, live: false };
}

function queueJob(type, orderNumber, payload = {}) {
  const jobKey = `${type}:${orderNumber}`;
  db.prepare(`
    INSERT OR IGNORE INTO automation_jobs(job_key, type, order_number, payload, next_run_at)
    VALUES(?,?,?,?, datetime('now'))
  `).run(jobKey, type, orderNumber, JSON.stringify(payload));
}

function ensureFlow(orderNumber) {
  db.prepare("INSERT OR IGNORE INTO order_flow(order_number) VALUES(?)").run(orderNumber);
}

function queueOrderCreated(orderNumber) {
  return {
    ok: false,
    code: "SALES_CLOSED",
    orderNumber: orderNumber || null,
    queued: false,
    paymentAuthorized: false,
    shipmentCreated: false,
    live: false,
  };
}

function handlePaymentWebhook(body = {}) {
  const { provider = null, eventId, orderNumber, status } = body;
  if (!eventId || !orderNumber) {
    return { ok: false, error: "eventId and orderNumber required", status: 400 };
  }

  return {
    ok: false,
    error: "PAYMENT_UNVERIFIED",
    code: "PAYMENT_UNVERIFIED",
    status: 409,
    provider,
    orderNumber,
    eventId,
    reportedStatus: status || null,
    captured: false,
    idempotent: false,
    live: false,
  };
}

function recordShipmentCreated({ orderNumber } = {}) {
  return {
    ok: false,
    live: false,
    mock: false,
    blocked: true,
    status: "BLOCKED_EXTERNAL",
    code: "SHIPMENT_NOT_CREATED",
    trackingNumber: null,
    events: [],
    delivered: false,
    shipped: false,
    orderNumber: orderNumber || null,
  };
}

function recordSupplierResult({ orderNumber } = {}) {
  return {
    ok: false,
    code: "SUPPLIER_NOT_LIVE",
    orderNumber: orderNumber || null,
    supplierOrderCreated: false,
    purchased: false,
    confirmed: false,
    submissionStatus: "BLOCKED_EXTERNAL",
    live: false,
  };
}

function retryJob(id) {
  const job = db.prepare("SELECT * FROM automation_jobs WHERE id = ?").get(id);
  if (!job) return { ok: false, error: "Job not found", status: 404, recovered: false, requeued: false };
  return {
    ok: false,
    error: "RETRY_NOT_CONFIRMED",
    code: "RETRY_NOT_CONFIRMED",
    status: 409,
    recovered: false,
    requeued: false,
    sent: false,
    live: false,
    jobId: job.id,
  };
}

function listJobs(limit = 200) {
  return db.prepare("SELECT * FROM automation_jobs ORDER BY id DESC LIMIT ?").all(limit);
}

function listIntegrationEvents(limit = 200) {
  return db.prepare("SELECT * FROM integration_events ORDER BY id DESC LIMIT ?").all(limit);
}

function getOrderFlowDetail(orderNumber) {
  return {
    flow: db.prepare("SELECT * FROM order_flow WHERE order_number = ?").get(orderNumber) || null,
    events: db
      .prepare("SELECT * FROM integration_events WHERE order_number = ? ORDER BY id DESC")
      .all(orderNumber),
    jobs: db.prepare("SELECT * FROM automation_jobs WHERE order_number = ? ORDER BY id DESC").all(orderNumber),
  };
}

function getAutomationStatus() {
  const jobs = db.prepare("SELECT status, COUNT(*) count FROM automation_jobs GROUP BY status").all();
  const events = db
    .prepare("SELECT type, status, COUNT(*) count FROM integration_events GROUP BY type, status")
    .all();
  const flows = db
    .prepare(`
      SELECT payment_status, fulfillment_status, shipping_status, supplier_status, COUNT(*) count
      FROM order_flow
      GROUP BY payment_status, fulfillment_status, shipping_status, supplier_status
    `)
    .all();

  return {
    version: "0.6.0",
    enabled: isEnabled(),
    jobs,
    events,
    flows,
    providers: {
      payment: defaultPaymentProvider(),
      carrier: defaultCarrier(),
      supplierMode: process.env.DEFAULT_SUPPLIER_MODE || "manual",
    },
    totals: {
      jobs: db.prepare("SELECT COUNT(*) n FROM automation_jobs").get().n,
      events: db.prepare("SELECT COUNT(*) n FROM integration_events").get().n,
      flows: db.prepare("SELECT COUNT(*) n FROM order_flow").get().n,
    },
  };
}

module.exports = {
  isEnabled,
  queueOrderCreated,
  handlePaymentWebhook,
  recordShipmentCreated,
  recordSupplierResult,
  retryJob,
  listJobs,
  listIntegrationEvents,
  getOrderFlowDetail,
  getAutomationStatus,
  recordEvent,
  queueJob,
  ensureFlow,
};
