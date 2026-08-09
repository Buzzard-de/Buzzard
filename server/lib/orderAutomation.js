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

function recordEvent(type, orderNumber, provider, status, payload = {}) {
  const eventKey = crypto
    .createHash("sha256")
    .update(JSON.stringify({ type, orderNumber, provider, status, payload }))
    .digest("hex");
  db.prepare(`
    INSERT OR IGNORE INTO integration_events(event_key, type, order_number, provider, status, payload)
    VALUES(?,?,?,?,?,?)
  `).run(eventKey, type, orderNumber || null, provider || null, status, JSON.stringify(payload));
  return eventKey;
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
  if (!isEnabled() || !orderNumber) return { ok: false, reason: "disabled" };
  ensureFlow(orderNumber);
  queueJob("payment", orderNumber, { provider: defaultPaymentProvider() });
  queueJob("fulfillment", orderNumber, { carrier: defaultCarrier() });
  recordEvent("order_created", orderNumber, "internal", "queued", {});
  return { ok: true, orderNumber, status: "automation_queued" };
}

function handlePaymentWebhook(body = {}) {
  const { provider = "stripe", eventId, type, orderNumber, status } = body;
  if (!eventId || !orderNumber) {
    return { ok: false, error: "eventId and orderNumber required", status: 400 };
  }

  const eventKey = `payment:${eventId}`;
  const existing = db.prepare("SELECT id FROM integration_events WHERE event_key = ?").get(eventKey);
  if (existing) return { ok: true, idempotent: true };

  db.prepare(`
    INSERT INTO integration_events(event_key, type, order_number, provider, status, payload)
    VALUES(?,?,?,?,?,?)
  `).run(
    eventKey,
    "payment_webhook",
    orderNumber,
    provider,
    status || "received",
    JSON.stringify({ eventId, type })
  );

  ensureFlow(orderNumber);

  if (status === "paid") {
    db.prepare(`
      UPDATE order_flow
      SET payment_status = 'paid', updated_at = CURRENT_TIMESTAMP
      WHERE order_number = ?
    `).run(orderNumber);
    queueJob("fulfillment", orderNumber, {});
  } else if (status === "failed") {
    db.prepare(`
      UPDATE order_flow
      SET payment_status = 'failed', last_error = ?, updated_at = CURRENT_TIMESTAMP
      WHERE order_number = ?
    `).run("Payment failed", orderNumber);
  }

  return { ok: true };
}

function recordShipmentCreated({ orderNumber, carrier = "dhl", trackingNumber = null }) {
  ensureFlow(orderNumber);
  db.prepare(`
    UPDATE order_flow
    SET shipping_status = 'shipped', tracking_number = ?, updated_at = CURRENT_TIMESTAMP
    WHERE order_number = ?
  `).run(trackingNumber, orderNumber);
  recordEvent("shipment_created", orderNumber, carrier, "shipped", { trackingNumber });
  return { ok: true };
}

function recordSupplierResult({ orderNumber, supplier, status, supplierOrderId = null }) {
  ensureFlow(orderNumber);
  const accepted = status === "accepted";
  db.prepare(`
    UPDATE order_flow
    SET supplier_status = ?, fulfillment_status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE order_number = ?
  `).run(accepted ? "accepted" : status || "failed", accepted ? "processing" : "failed", orderNumber);
  recordEvent("supplier_forwarded", orderNumber, supplier, status, { supplierOrderId });
  return { ok: true };
}

function retryJob(id) {
  const job = db.prepare("SELECT * FROM automation_jobs WHERE id = ?").get(id);
  if (!job) return { ok: false, error: "Job not found", status: 404 };
  db.prepare(`
    UPDATE automation_jobs
    SET status = 'queued', attempts = attempts + 1, next_run_at = datetime('now'), last_error = NULL
    WHERE id = ?
  `).run(job.id);
  return { ok: true };
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
