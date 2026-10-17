/**
 * Live-map / GPS data model.
 * Holds only operator-marked synthetic fixtures. Never a customer GPS fix.
 *
 * Live location would require an authorized carrier telematics or device feed.
 * That feed is not configured in this workspace.
 */

function telematicsFeedConfigured() {
  return false;
}

function describeRequirement() {
  return {
    implemented: "PARTIAL",
    liveGps: false,
    liveMap: false,
    telematics: false,
    telematicsFeedConfigured: telematicsFeedConfigured(),
    requiredSource: "Authorized carrier telematics or device GPS feed with per-shipment consent",
    configured: false,
    note: "No live map provider is wired. Synthetic fixtures must set simulated=true.",
  };
}

function confirmLiveGps() {
  return {
    ok: false,
    liveGps: false,
    liveMap: false,
    telematics: false,
    telematicsFeedConfigured: false,
    gpsInvented: false,
    coordinates: null,
    reason: "LIVE_GPS_BLOCKED",
    note: "Operator telematics flags are not a GPS feed. No live location is confirmed.",
  };
}

function ingestGpsFix() {
  return {
    ok: false,
    ingested: false,
    liveGps: false,
    gpsInvented: false,
    reason: "GPS_INGEST_BLOCKED",
    note: "Inbound GPS fixes are not accepted without an authorized telematics connector.",
  };
}

function fixturePoint(input = {}) {
  if (input.simulated !== true) {
    return {
      ok: false,
      reason: "SIMULATED_FLAG_REQUIRED",
      liveGps: false,
      gpsInvented: false,
    };
  }
  const lat = Number(input.latitude);
  const lon = Number(input.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return { ok: false, reason: "COORDINATE_INVALID", liveGps: false, gpsInvented: false };
  }
  return {
    ok: true,
    simulated: true,
    liveGps: false,
    telematics: false,
    gpsInvented: false,
    latitude: lat,
    longitude: lon,
    label: input.label || "synthetic_fixture",
    note: "Synthetic map fixture. Not a customer or vehicle location.",
  };
}

function projectShipment(shipment = {}) {
  const invented = Boolean(shipment.location?.gpsInvented);
  return {
    ok: true,
    liveGps: false,
    liveMap: false,
    telematics: false,
    telematicsFeedConfigured: false,
    gpsInvented: invented,
    locationType: invented ? "not_available" : shipment.location?.type || "not_available",
    trackingStatus: shipment.status || null,
    latitude: null,
    longitude: null,
    points: [],
    requirement: describeRequirement(),
  };
}

function customerProjection(shipment = {}) {
  const projected = projectShipment(shipment);
  return {
    ...projected,
    liveGps: false,
    coordinatesHidden: true,
    note: "Customer tracking is scan-status only. Map pins are never live GPS.",
  };
}

module.exports = {
  telematicsFeedConfigured,
  describeRequirement,
  confirmLiveGps,
  ingestGpsFix,
  fixturePoint,
  projectShipment,
  customerProjection,
};
