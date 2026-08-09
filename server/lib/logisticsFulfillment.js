const { db } = require("./db");

function isEnabled() {
  return process.env.BUZZARD_LOGISTICS_FULFILLMENT !== "0" && process.env.BUZZARD_DB_ENABLED !== "0";
}

function rmaNumber() {
  return `RMA-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function listShippingOptions(country) {
  const code = String(country || "DE").toUpperCase();
  return db
    .prepare(`
      SELECT s.*, c.code AS carrier, c.name AS carrier_name
      FROM logistics_shipping_services s
      JOIN logistics_carriers c ON c.id = s.carrier_id
      WHERE s.active = 1
        AND c.enabled = 1
        AND (',' || s.countries || ',') LIKE '%,' || ? || ',%'
      ORDER BY s.base_price
    `)
    .all(code);
}

function quoteShipment(body = {}) {
  const country = String(body.country || "DE").toUpperCase();
  const weight = Number(body.weightKg || 1);
  const rows = db
    .prepare(`
      SELECT s.*, c.code AS carrier
      FROM logistics_shipping_services s
      JOIN logistics_carriers c ON c.id = s.carrier_id
      WHERE s.active = 1
        AND c.enabled = 1
        AND (',' || s.countries || ',') LIKE '%,' || ? || ',%'
        AND s.max_weight_kg >= ?
      ORDER BY s.base_price
    `)
    .all(country, weight);
  const best = rows[0];
  if (!best) return { error: "No shipping service available", status: 404 };
  return { quote: { ...best, estimatedCost: best.base_price } };
}

function createShipment(body = {}) {
  const orderNumber = String(body.orderNumber || "").trim();
  const country = String(body.country || "").trim();
  if (!orderNumber || !country) return { error: "orderNumber and country required", status: 400 };

  const service = body.serviceId
    ? db
        .prepare(`
          SELECT s.*, c.id AS carrier_id, c.code AS carrier
          FROM logistics_shipping_services s
          JOIN logistics_carriers c ON c.id = s.carrier_id
          WHERE s.id = ?
        `)
        .get(body.serviceId)
    : null;
  if (!service) return { error: "Shipping service not found", status: 404 };

  try {
    const result = db
      .prepare(`
        INSERT INTO logistics_shipments(order_number, carrier_id, service_id, shipping_cost, destination_country)
        VALUES(?,?,?,?,?)
      `)
      .run(orderNumber, service.carrier_id, service.id, service.base_price, country.toUpperCase());
    db.prepare("INSERT INTO logistics_fulfillment_jobs(order_number, job_type) VALUES(?,?)").run(
      orderNumber,
      "create_label"
    );
    const shipment = db.prepare("SELECT * FROM logistics_shipments WHERE id = ?").get(result.lastInsertRowid);
    return { shipment };
  } catch {
    return { error: "Shipment already exists for order", status: 409 };
  }
}

function updateLabelResult(id, body = {}) {
  const shipment = db.prepare("SELECT * FROM logistics_shipments WHERE id = ?").get(id);
  if (!shipment) return { error: "Shipment not found", status: 404 };

  const status = body.status || "label_created";
  db.prepare(`
    UPDATE logistics_shipments
    SET tracking_number = ?, label_url = ?, status = ?,
        shipped_at = CASE WHEN ? = 'shipped' THEN CURRENT_TIMESTAMP ELSE shipped_at END
    WHERE id = ?
  `).run(body.trackingNumber || "", body.labelUrl || "", status, status, id);

  const updated = db.prepare("SELECT * FROM logistics_shipments WHERE id = ?").get(id);
  if (updated?.tracking_number) {
    db.prepare(
      "INSERT INTO logistics_tracking_events(shipment_id, status, message) VALUES(?,?,?)"
    ).run(updated.id, "label_created", "Shipping label created");
  }
  return { shipment: updated };
}

function listShipments() {
  return db
    .prepare(`
      SELECT sh.*, c.code AS carrier, s.name AS service_name
      FROM logistics_shipments sh
      LEFT JOIN logistics_carriers c ON c.id = sh.carrier_id
      LEFT JOIN logistics_shipping_services s ON s.id = sh.service_id
      ORDER BY sh.id DESC
    `)
    .all();
}

function getShipmentTracking(orderNumber) {
  const shipment = db
    .prepare(`
      SELECT sh.*, c.name AS carrier, s.name AS service_name
      FROM logistics_shipments sh
      LEFT JOIN logistics_carriers c ON c.id = sh.carrier_id
      LEFT JOIN logistics_shipping_services s ON s.id = sh.service_id
      WHERE sh.order_number = ?
    `)
    .get(orderNumber);
  if (!shipment) return { error: "Shipment not found", status: 404 };
  const events = db
    .prepare(
      "SELECT * FROM logistics_tracking_events WHERE shipment_id = ? ORDER BY event_time DESC, id DESC"
    )
    .all(shipment.id);
  return { tracking: { ...shipment, events } };
}

function handleCarrierWebhook(body = {}) {
  const orderNumber = String(body.orderNumber || "").trim();
  const status = String(body.status || "").trim();
  if (!orderNumber || !status) return { error: "orderNumber and status required", status: 400 };

  const shipment = db
    .prepare("SELECT id FROM logistics_shipments WHERE order_number = ?")
    .get(orderNumber);
  if (!shipment) return { error: "Shipment not found", status: 404 };

  db.prepare("UPDATE logistics_shipments SET status = ? WHERE id = ?").run(status, shipment.id);
  db.prepare(
    "INSERT INTO logistics_tracking_events(shipment_id, status, location, message, event_time) VALUES(?,?,?,?,?)"
  ).run(
    shipment.id,
    status,
    body.location || "",
    body.message || "",
    body.eventTime || new Date().toISOString()
  );
  return { ok: true, status: 202 };
}

function createReturn(body = {}, customerId) {
  const orderNumber = String(body.orderNumber || "").trim();
  const reason = String(body.reason || "").trim();
  if (!orderNumber || !reason) return { error: "orderNumber and reason required", status: 400 };

  const number = rmaNumber();
  const result = db
    .prepare(`
      INSERT INTO logistics_returns(rma_number, order_number, customer_id, reason, carrier_code)
      VALUES(?,?,?,?,?)
    `)
    .run(number, orderNumber, customerId, reason, body.carrierCode || "DHL");
  const row = db.prepare("SELECT * FROM logistics_returns WHERE id = ?").get(result.lastInsertRowid);
  return { returnRequest: row };
}

function listCustomerReturns(customerId) {
  return db
    .prepare("SELECT * FROM logistics_returns WHERE customer_id = ? ORDER BY id DESC")
    .all(customerId);
}

function listAdminReturns() {
  return db.prepare("SELECT * FROM logistics_returns ORDER BY id DESC").all();
}

function updateReturn(id, body = {}) {
  const row = db.prepare("SELECT id FROM logistics_returns WHERE id = ?").get(id);
  if (!row) return { error: "Return not found", status: 404 };
  db.prepare(`
    UPDATE logistics_returns
    SET status = COALESCE(?, status),
        return_tracking = COALESCE(?, return_tracking),
        refund_status = COALESCE(?, refund_status)
    WHERE id = ?
  `).run(body.status || null, body.returnTracking || null, body.refundStatus || null, id);
  return { returnRequest: db.prepare("SELECT * FROM logistics_returns WHERE id = ?").get(id) };
}

function listFulfillmentJobs() {
  return db
    .prepare("SELECT * FROM logistics_fulfillment_jobs ORDER BY id DESC LIMIT 200")
    .all();
}

function listCarriers() {
  return db
    .prepare(`
      SELECT c.*,
             (SELECT COUNT(*) FROM logistics_shipping_services s WHERE s.carrier_id = c.id AND s.active = 1) service_count
      FROM logistics_carriers c
      ORDER BY c.name
    `)
    .all()
    .map((row) => ({
      ...row,
      enabled: Boolean(row.enabled),
      api_connected: Boolean(row.api_connected),
    }));
}

function getLogisticsFulfillmentStatus() {
  return {
    version: "1.7.0",
    enabled: isEnabled(),
    carriers: db.prepare("SELECT COUNT(*) n FROM logistics_carriers WHERE enabled = 1").get().n,
    totals: {
      carriers: db.prepare("SELECT COUNT(*) n FROM logistics_carriers").get().n,
      shippingServices: db
        .prepare("SELECT COUNT(*) n FROM logistics_shipping_services WHERE active = 1")
        .get().n,
      shipments: db.prepare("SELECT COUNT(*) n FROM logistics_shipments").get().n,
      trackingEvents: db.prepare("SELECT COUNT(*) n FROM logistics_tracking_events").get().n,
      fulfillmentJobs: db.prepare("SELECT COUNT(*) n FROM logistics_fulfillment_jobs").get().n,
      queuedJobs: db
        .prepare("SELECT COUNT(*) n FROM logistics_fulfillment_jobs WHERE status = 'queued'")
        .get().n,
      returns: db.prepare("SELECT COUNT(*) n FROM logistics_returns").get().n,
    },
  };
}

module.exports = {
  isEnabled,
  listShippingOptions,
  quoteShipment,
  createShipment,
  updateLabelResult,
  listShipments,
  getShipmentTracking,
  handleCarrierWebhook,
  createReturn,
  listCustomerReturns,
  listAdminReturns,
  updateReturn,
  listFulfillmentJobs,
  listCarriers,
  getLogisticsFulfillmentStatus,
};
