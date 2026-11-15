const BUZZARD_EVENTS = Object.freeze([
  "ORDER_CONFIRMED",
  "SUPPLIER_PROCESSING",
  "READY_FOR_PICKUP",
  "PICKED_UP",
  "IN_TRANSIT",
  "ARRIVED_AT_HUB",
  "OUT_FOR_DELIVERY",
  "DELIVERY_ATTEMPTED",
  "DELAYED",
  "DELIVERED",
  "RETURN_REQUESTED",
  "RETURN_IN_TRANSIT",
  "RETURN_RECEIVED",
  "DELIVERY_EXCEPTION",
]);

const MAP = {
  info: "IN_TRANSIT",
  pickup: "PICKED_UP",
  delivered: "DELIVERED",
  exception: "DELIVERY_EXCEPTION",
  delay: "DELAYED",
  return: "RETURN_IN_TRANSIT",
};

function normalizeCarrierEvent(raw = {}) {
  const key = String(raw.code || raw.status || "").toLowerCase();
  const mapped = MAP[key];
  return {
    buzzardStatus: mapped || "UNKNOWN",
    raw: raw.code || raw.status || "UNKNOWN",
    at: raw.at || "UNKNOWN",
    live: false,
    delivered: false,
    deliveryConfirmed: false,
    customerVisible: "NO_VERIFIED_TRACKING",
  };
}

function projectTrackingHistory(events = []) {
  const history = (Array.isArray(events) ? events : []).map((event) => normalizeCarrierEvent(event));
  return {
    ok: false,
    live: false,
    mock: false,
    events: [],
    history,
    trackingNumber: null,
    delivered: false,
    deliveryConfirmed: false,
    shipmentCreated: false,
    customerVisible: "NO_VERIFIED_TRACKING",
  };
}

module.exports = { BUZZARD_EVENTS, normalizeCarrierEvent, projectTrackingHistory };
