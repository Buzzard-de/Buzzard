/**
 * Canonical shipment tracking. Customer may only see their own order.
 * Estimated movement is never presented as carrier GPS.
 */

const crypto = require("crypto");
const shippingProvider = require("../commerce/shippingProvider");
const { TRACKING_STATUS, LOCATION_TYPE, DEFAULT_STALE_TRACKING_MS } = require("./constants");

const STATUS_RANK = Object.freeze({
  [TRACKING_STATUS.UNKNOWN]: 0,
  [TRACKING_STATUS.CREATED]: 1,
  [TRACKING_STATUS.IN_TRANSIT]: 2,
  [TRACKING_STATUS.DELAYED]: 2,
  [TRACKING_STATUS.OUT_FOR_DELIVERY]: 3,
  [TRACKING_STATUS.EXCEPTION]: 3,
  [TRACKING_STATUS.DELIVERED]: 4,
  [TRACKING_STATUS.FAILED_DELIVERY]: 4,
  [TRACKING_STATUS.RETURN_TO_SENDER]: 4,
});

function validateTrackingNumber(value) {
  const trackingNumber = String(value || "").trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,63}$/.test(trackingNumber)) {
    return { ok: false, reason: "TRACKING_NUMBER_INVALID" };
  }
  return { ok: true, trackingNumber };
}

function newId(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

function normalizeEvent(event = {}) {
  const gpsClaimed = Boolean(event.gps || event.latitude || event.longitude);
  const carrierGps = Boolean(event.carrierGps === true && gpsClaimed);
  const simulated = event.simulated === true;
  return {
    status: event.status || TRACKING_STATUS.UNKNOWN,
    description: event.description || event.message || null,
    occurredAt: event.occurredAt || event.timestamp || new Date().toISOString(),
    locationType: carrierGps ? LOCATION_TYPE.CARRIER_GPS : event.locationType || LOCATION_TYPE.CARRIER_EVENT,
    gpsInvented: false,
    carrierGps,
    simulated,
    note: simulated
      ? "Simulated tracking event. Not carrier-reported live GPS."
      : carrierGps
        ? null
        : gpsClaimed
          ? "Coordinate-like fields ignored without carrierGps=true"
          : null,
  };
}

function createShipment(db, input = {}) {
  const orderId = String(input.orderId || "").trim();
  const customerId = String(input.customerId || "").trim();
  const trackingCheck = validateTrackingNumber(input.trackingNumber);
  if (!orderId || !customerId) {
    return { ok: false, reason: "ORDER_CUSTOMER_TRACKING_REQUIRED" };
  }
  if (!trackingCheck.ok) {
    return { ok: false, reason: trackingCheck.reason };
  }
  const trackingNumber = trackingCheck.trackingNumber;

  const estimate = shippingProvider.calculateShipping({
    methodId: input.methodId,
    country: input.country || "DE",
  });

  const id = newId("sship");
  const now = new Date().toISOString();
  const events = Array.isArray(input.events) ? input.events : [];
  try {
    db.prepare(
      `INSERT INTO software_shipments(
        id, order_id, customer_id, tracking_number, carrier, status,
        estimated_delivery, last_update, location_type, gps_invented
      ) VALUES(?,?,?,?,?,?,?,?,?,0)`
    ).run(
      id,
      orderId,
      customerId,
      trackingNumber,
      input.carrier || null,
      input.status || TRACKING_STATUS.CREATED,
      input.estimatedDelivery || estimate.estimatedDelivery,
      events.length ? null : now,
      LOCATION_TYPE.NOT_AVAILABLE
    );
  } catch (error) {
    if (require("../security").isUniqueConstraint(error)) {
      const existing = db.prepare("SELECT * FROM software_shipments WHERE tracking_number = ?").get(trackingNumber);
      return { ok: true, duplicate: true, shipment: mapShipment(existing, db), shipmentCreated: false };
    }
    return { ok: false, reason: "SHIPMENT_WRITE_FAILED", error: require("../security").publicTaskError(error, "SHIPMENT_WRITE_FAILED") };
  }

  for (const event of events) {
    appendEvent(db, id, event);
  }

  return {
    ok: true,
    shipmentCreated: false,
    liveCarrier: false,
    shipment: mapShipment(db.prepare("SELECT * FROM software_shipments WHERE id = ?").get(id), db),
  };
}

function appendEvent(db, shipmentId, event) {
  const shipment = db.prepare("SELECT * FROM software_shipments WHERE id = ?").get(shipmentId);
  if (!shipment) {
    return { ok: false, reason: "NOT_FOUND", gpsInvented: false, statusAdvanced: false };
  }
  const normalized = normalizeEvent(event);
  const eventId = event.eventId ? String(event.eventId) : null;
  if (eventId) {
    const byId = db
      .prepare(
        `SELECT id FROM software_shipment_events
         WHERE shipment_id = ? AND json_extract(raw_json, '$.eventId') = ?`
      )
      .get(shipmentId, eventId);
    if (byId) {
      return { ...normalized, ok: true, duplicate: true, eventId, statusAdvanced: false, outOfOrder: false };
    }
  }
  const existing = db
    .prepare(
      `SELECT id FROM software_shipment_events
       WHERE shipment_id = ? AND status = ? AND occurred_at = ?`
    )
    .get(shipmentId, normalized.status, normalized.occurredAt);
  if (existing) {
    return { ...normalized, ok: true, duplicate: true, statusAdvanced: false, outOfOrder: false };
  }

  db.prepare(
    `INSERT INTO software_shipment_events(
      id, shipment_id, status, description, occurred_at, location_type, gps_invented, raw_json
    ) VALUES(?,?,?,?,?,?,0,?)`
  ).run(
    newId("ssevt"),
    shipmentId,
    normalized.status,
    normalized.description,
    normalized.occurredAt,
    normalized.locationType,
    JSON.stringify({
      note: normalized.note,
      carrierGps: normalized.carrierGps,
      simulated: normalized.simulated,
      eventId,
    })
  );

  const eventTime = Date.parse(normalized.occurredAt);
  const lastTime = shipment.last_update ? Date.parse(shipment.last_update) : Number.NEGATIVE_INFINITY;
  const newer = Number.isFinite(eventTime) && (!Number.isFinite(lastTime) || eventTime >= lastTime);
  const currentRank = STATUS_RANK[shipment.status] ?? 0;
  const nextRank = STATUS_RANK[normalized.status] ?? 0;
  const regression = nextRank < currentRank && normalized.status !== TRACKING_STATUS.EXCEPTION;
  if (newer && !regression) {
    db.prepare(
      `UPDATE software_shipments
       SET status = ?, last_update = ?, location_type = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(normalized.status, normalized.occurredAt, normalized.locationType, shipmentId);
  }
  return {
    ...normalized,
    ok: true,
    duplicate: false,
    statusAdvanced: newer && !regression,
    outOfOrder: !newer,
    statusRegressed: regression,
  };
}

function mapShipment(row, db) {
  if (!row) return null;
  const events = db
    .prepare("SELECT * FROM software_shipment_events WHERE shipment_id = ? ORDER BY created_at")
    .all(row.id);
  const last = row.last_update ? Date.parse(row.last_update) : NaN;
  const stale = Number.isNaN(last) || Date.now() - last > DEFAULT_STALE_TRACKING_MS;
  return {
    id: row.id,
    orderId: row.order_id,
    customerId: row.customer_id,
    trackingNumber: row.tracking_number,
    carrier: row.carrier,
    status: row.status,
    estimatedDelivery: row.estimated_delivery,
    lastUpdate: row.last_update,
    stale,
    location: {
      type: row.location_type,
      gpsInvented: Boolean(row.gps_invented),
    },
    events: events.map((e) => {
      let raw = {};
      try {
        raw = JSON.parse(e.raw_json || "{}");
      } catch {
        raw = {};
      }
      return {
        status: e.status,
        description: e.description,
        occurredAt: e.occurred_at,
        locationType: e.location_type,
        gpsInvented: Boolean(e.gps_invented),
        simulated: raw.simulated === true,
      };
    }),
    shipmentCreated: false,
    liveCarrier: false,
  };
}

function ingestVerifiedCarrierEvent(db, { shipmentId, verification, mappedEvent, occurredAt } = {}) {
  if (!verification || verification.verified !== true) {
    return {
      ok: false,
      reason: verification?.reason || "WEBHOOK_NOT_VERIFIED",
      gpsInvented: false,
      statusAdvanced: false,
    };
  }
  if (!mappedEvent || !mappedEvent.status) {
    return { ok: false, reason: "EVENT_REQUIRED", gpsInvented: false, statusAdvanced: false };
  }
  return appendEvent(db, shipmentId, {
    status: mappedEvent.status,
    eventId: mappedEvent.eventId,
    occurredAt: occurredAt || new Date().toISOString(),
    simulated: mappedEvent.simulated === true,
    carrierGps: false,
  });
}

function getForCustomer(db, { shipmentId, orderId, trackingNumber, customerId } = {}) {
  if (!customerId) {
    return { ok: false, denied: true, reason: "CUSTOMER_REQUIRED" };
  }
  let row = null;
  if (shipmentId) row = db.prepare("SELECT * FROM software_shipments WHERE id = ?").get(shipmentId);
  else if (trackingNumber) row = db.prepare("SELECT * FROM software_shipments WHERE tracking_number = ?").get(trackingNumber);
  else if (orderId) row = db.prepare("SELECT * FROM software_shipments WHERE order_id = ?").get(orderId);
  if (!row) return { ok: false, reason: "NOT_FOUND" };
  if (row.customer_id !== customerId) {
    return { ok: false, denied: true, reason: "ACCESS_DENIED" };
  }
  return { ok: true, shipment: mapShipment(row, db) };
}

module.exports = {
  normalizeEvent,
  validateTrackingNumber,
  createShipment,
  appendEvent,
  ingestVerifiedCarrierEvent,
  getForCustomer,
  mapShipment,
};
