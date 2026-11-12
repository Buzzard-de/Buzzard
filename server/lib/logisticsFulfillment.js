const { db } = require("./db");

function isEnabled() {
  return process.env.BUZZARD_LOGISTICS_FULFILLMENT !== "0" && process.env.BUZZARD_DB_ENABLED !== "0";
}

function listShippingOptions(country) {
  const code = String(country || "").toUpperCase();
  if (!code) return [];
  return db
    .prepare(`
      SELECT s.id, s.code, s.name, s.max_weight_kg, s.countries, c.code AS carrier, c.name AS carrier_name
      FROM logistics_shipping_services s
      JOIN logistics_carriers c ON c.id = s.carrier_id
      WHERE s.active = 1
        AND c.enabled = 1
        AND (',' || s.countries || ',') LIKE '%,' || ? || ',%'
      ORDER BY c.code, s.code
    `)
    .all(code)
    .map((row) => ({
      ...row,
      price: null,
      status: "SHIPPING_RATE_UNVERIFIED",
      commercialEligibility: "BLOCKED",
      live: false,
    }));
}

function quoteShipment(body = {}) {
  const { selectTransportCost } = require("./commerce/pricingPolicy");
  const transport = selectTransportCost({
    origin: body.origin || body.supplierOrigin,
    country: body.country,
    zone: body.zone || body.deliveryZone,
    weightKg: body.weightKg ?? body.weight,
    dimensions: body.dimensions,
    rates: body.rates,
    shippingIncluded: body.shippingIncluded === true,
    supplierOfferIncludesShipping: body.supplierOfferIncludesShipping === true,
    inclusionEvidence: body.inclusionEvidence,
  });
  return {
    ok: transport.ok,
    error: transport.ok ? undefined : transport.code,
    status: transport.ok ? 200 : 409,
    quote: transport,
    estimatedCost: transport.ok ? transport.shippingCost : null,
    live: false,
    integration: "BLOCKED",
    tablePriceUsed: false,
  };
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
  return {
    ok: false,
    error: "SHIPPING_RATE_UNVERIFIED",
    code: "SHIPMENT_NOT_CREATED",
    status: 409,
    shipment: null,
    shipmentCreated: false,
    live: false,
    orderNumber,
    destination: country.toUpperCase(),
  };
}

function updateLabelResult(id) {
  return {
    ok: false,
    live: false,
    mock: false,
    blocked: true,
    status: "BLOCKED_EXTERNAL",
    code: "LABEL_NOT_CREATED",
    trackingNumber: null,
    events: [],
    delivered: false,
    shipmentCreated: false,
    id,
  };
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
  return {
    ok: false,
    live: false,
    mock: false,
    status: "BLOCKED_EXTERNAL",
    verified: false,
    trackingNumber: null,
    events: [],
    delivered: false,
    tracking: { ...shipment, events, live: false, verified: false },
  };
}

function handleCarrierWebhook() {
  return {
    ok: false,
    live: false,
    mock: false,
    blocked: true,
    accepted: false,
    status: "BLOCKED_EXTERNAL",
    code: "CARRIER_WEBHOOK_UNVERIFIED",
    trackingNumber: null,
    events: [],
    delivered: false,
  };
}

function createReturn() {
  return {
    ok: false,
    error: "RETURN_UNVERIFIED",
    code: "RETURN_UNVERIFIED",
    status: 409,
    created: false,
    stored: false,
    refunded: false,
    live: false,
    callerFlagIgnored: true,
  };
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
  if (body.refundStatus || body.returnTracking || body.status) {
    return {
      ok: false,
      error: "RETURN_STATUS_UNVERIFIED",
      code: "RETURN_STATUS_UNVERIFIED",
      status: 409,
      refunded: false,
      trackingNumber: null,
      live: false,
    };
  }
  return { ok: false, code: "RETURN_STATUS_UNVERIFIED", status: 409, live: false };
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
