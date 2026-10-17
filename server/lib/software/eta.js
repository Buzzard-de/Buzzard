/**
 * Schedule-based ETA and delay detection.
 * Not carrier GPS. Not a live map. Not a customer location.
 */

const { TRACKING_STATUS, DEFAULT_STALE_TRACKING_MS } = require("./constants");
const shippingProvider = require("../commerce/shippingProvider");

function scheduleEta(input = {}) {
  const quote = shippingProvider.calculateShipping({
    methodId: input.methodId,
    country: input.country || "DE",
    subtotal: input.subtotal || 0,
  });
  return {
    ok: true,
    source: "schedule_fixture",
    gps: false,
    liveMap: false,
    telematics: false,
    live: false,
    estimatedDelivery: quote.estimatedDelivery,
    methodId: quote.methodId,
    country: input.country || "DE",
    note: "Calendar offset from shipping method. Not a vehicle position.",
  };
}

function evaluateShipment(shipment = {}, now = Date.now()) {
  const status = shipment.status || TRACKING_STATUS.UNKNOWN;
  const last = shipment.lastUpdate ? Date.parse(shipment.lastUpdate) : NaN;
  const stale = Number.isNaN(last) || now - last > DEFAULT_STALE_TRACKING_MS;
  const delayed = status === TRACKING_STATUS.DELAYED || (stale && status === TRACKING_STATUS.IN_TRANSIT);
  const failed = status === TRACKING_STATUS.FAILED_DELIVERY;
  const gpsClaimed = Boolean(shipment.gps || shipment.liveGps || shipment.latitude || shipment.longitude);
  const telematics = shipment.telematicsAuthorized === true;
  if (gpsClaimed && !telematics) {
    return {
      ok: false,
      gps: false,
      liveMap: false,
      telematics: false,
      live: false,
      gpsInvented: false,
      reason: "GPS_CLAIM_WITHOUT_TELEMATICS",
      status,
      source: "shipment_events_plus_schedule",
    };
  }
  if (gpsClaimed && telematics) {
    return {
      ok: false,
      gps: false,
      liveMap: false,
      telematics: false,
      live: false,
      gpsInvented: false,
      reason: "LIVE_GPS_FEED_NOT_CONFIGURED",
      status,
      source: "shipment_events_plus_schedule",
      note: "telematicsAuthorized is not a configured GPS feed.",
    };
  }
  return {
    ok: true,
    gps: false,
    liveMap: false,
    telematics: false,
    live: false,
    status,
    stale,
    delayed,
    failedDelivery: failed,
    eta: shipment.estimatedDelivery || null,
    source: "shipment_events_plus_schedule",
    note: "Delay/failure from normalized scan events and staleness. No GPS invented.",
  };
}

module.exports = {
  scheduleEta,
  evaluateShipment,
};
