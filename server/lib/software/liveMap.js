/**
 * Live-map / GPS data model.
 * Holds only operator-marked synthetic fixtures. Never a customer GPS fix.
 *
 * Live location would require an authorized carrier telematics or device feed.
 * That feed is not configured in this workspace.
 */

function describeRequirement() {
  return {
    implemented: "PARTIAL",
    liveGps: false,
    liveMap: false,
    telematics: false,
    requiredSource: "Authorized carrier telematics or device GPS feed with per-shipment consent",
    configured: false,
    note: "No live map provider is wired. Synthetic fixtures must set simulated=true.",
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
  return {
    ok: true,
    liveGps: false,
    liveMap: false,
    telematics: false,
    gpsInvented: Boolean(shipment.location?.gpsInvented),
    locationType: shipment.location?.type || "not_available",
    trackingStatus: shipment.status || null,
    points: [],
    requirement: describeRequirement(),
  };
}

module.exports = {
  describeRequirement,
  fixturePoint,
  projectShipment,
};
