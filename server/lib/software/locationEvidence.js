/**
 * Location records. Coordinates are never fabricated.
 * Planned destination is not delivery proof. Depot is not the customer point.
 */

const { LOCATION_KIND } = require("./secureCommerceConstants");
const { newId, writeAudit } = require("./secureIds");
const { DEFAULT_STALE_TRACKING_MS } = require("./constants");

function validCoord(lat, lon) {
  return Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

function record(db, input = {}) {
  const kind = input.kind || LOCATION_KIND.UNKNOWN;
  if (!Object.values(LOCATION_KIND).includes(kind)) {
    return { ok: false, reason: "LOCATION_KIND_INVALID" };
  }
  if (input.invented === true || input.fabricate === true) {
    return { ok: false, reason: "GPS_FABRICATION_REJECTED", gpsInvented: false };
  }

  let latitude = input.latitude;
  let longitude = input.longitude;
  if (kind === LOCATION_KIND.VERIFIED_DELIVERY) {
    if (!validCoord(latitude, longitude)) {
      return { ok: false, reason: "INVALID_COORDINATES", gpsInvented: false };
    }
    if (input.source !== "carrier_verified") {
      return { ok: false, reason: "VERIFIED_SOURCE_REQUIRED", gpsInvented: false };
    }
  } else if (kind === LOCATION_KIND.PLANNED_DESTINATION) {
    if (input.treatAsDeliveryProof === true) {
      return { ok: false, reason: "PLANNED_DESTINATION_NOT_PROOF" };
    }
  } else if (latitude != null || longitude != null) {
    if (!validCoord(Number(latitude), Number(longitude))) {
      return { ok: false, reason: "INVALID_COORDINATES", gpsInvented: false };
    }
  } else {
    latitude = null;
    longitude = null;
  }

  if (kind === LOCATION_KIND.ESTIMATED && input.labelAsVerified) {
    return { ok: false, reason: "ESTIMATED_IS_NOT_VERIFIED" };
  }

  const id = newId("sloc");
  db.prepare(
    `INSERT INTO software_location_records(
      id, shipment_id, order_id, kind, latitude, longitude, occurred_at, source, authorized, details_json
    ) VALUES(?,?,?,?,?,?,?,?,?,?)`
  ).run(
    id,
    input.shipmentId || null,
    input.orderId || null,
    kind,
    latitude,
    longitude,
    input.occurredAt || new Date().toISOString(),
    input.source || null,
    input.authorized === true ? 1 : 0,
    JSON.stringify({
      gpsInvented: false,
      liveContinuousGps: false,
      plannedDestinationIsNotProof: kind === LOCATION_KIND.PLANNED_DESTINATION,
      depotIsNotCustomerPoint: kind === LOCATION_KIND.CARRIER_DEPOT,
    })
  );
  writeAudit(db, "location.record", input.shipmentId || input.orderId, { kind });
  return {
    ok: true,
    id,
    kind,
    latitude,
    longitude,
    gpsInvented: false,
    deliveryProof: kind === LOCATION_KIND.VERIFIED_DELIVERY,
    liveContinuousGps: false,
  };
}

function view(db, shipmentId, { authorized = false } = {}) {
  const rows = db.prepare("SELECT * FROM software_location_records WHERE shipment_id = ?").all(shipmentId);
  return rows.map((row) => {
    const occurred = row.occurred_at ? Date.parse(row.occurred_at) : NaN;
    const stale = Number.isNaN(occurred) || Date.now() - occurred > DEFAULT_STALE_TRACKING_MS;
    const hidePrecise = row.kind === LOCATION_KIND.VERIFIED_DELIVERY && !authorized;
    return {
      kind: row.kind,
      latitude: hidePrecise ? null : row.latitude,
      longitude: hidePrecise ? null : row.longitude,
      occurredAt: row.occurred_at,
      source: row.source,
      stale,
      unauthorized: hidePrecise,
      gpsInvented: false,
      deliveryProof: row.kind === LOCATION_KIND.VERIFIED_DELIVERY && !hidePrecise,
    };
  });
}

module.exports = { record, view, validCoord, LOCATION_KIND };
