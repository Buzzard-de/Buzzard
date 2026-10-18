/**
 * Carrier adapter classification. Scan-event tracking only. No live shipment create.
 */

const shippingProvider = require("../commerce/shippingProvider");

const CARRIERS = Object.freeze([
  { id: "dhl", name: "DHL", env: ["DHL_API_KEY", "DHL_CLIENT_ID"] },
  { id: "dpd", name: "DPD", env: ["DPD_API_KEY"] },
  { id: "gls", name: "GLS", env: ["GLS_API_KEY"] },
  { id: "hermes", name: "Hermes", env: ["HERMES_API_KEY"] },
  { id: "ups", name: "UPS", env: ["UPS_API_KEY", "UPS_CLIENT_ID"] },
]);

function envPresent(names) {
  return names.some((name) => Boolean(process.env[name]));
}

function classify(id) {
  const def = CARRIERS.find((c) => c.id === id);
  if (!def) {
    return { id, status: "UNKNOWN", live: false, shipmentCreated: false, gpsInvented: false };
  }
  const configured = envPresent(def.env);
  return {
    id: def.id,
    name: def.name,
    adapterExists: true,
    credentialsPresent: configured,
    authTested: false,
    networkTested: false,
    liveReadTested: false,
    liveWriteConfigured: false,
    operationallyVerified: false,
    shipmentCreated: false,
    gpsInvented: false,
    status: configured ? "NOT_VERIFIED" : "NOT_CONFIGURED",
    live: false,
    blocked: true,
    requiredEnv: def.env,
  };
}

function listCarriers() {
  return CARRIERS.map((c) => classify(c.id));
}

function lookup(input = {}) {
  if (input.trackingNumber != null && !String(input.trackingNumber).trim()) {
    return {
      ok: false,
      live: false,
      shipmentCreated: false,
      gpsInvented: false,
      status: "ERROR",
      reason: "TRACKING_NUMBER_INVALID",
    };
  }
  if (input.forceError === "outage") {
    return {
      ok: false,
      live: false,
      shipmentCreated: false,
      gpsInvented: false,
      status: "ERROR",
      reason: "CARRIER_OUTAGE",
      retryable: false,
    };
  }
  if (input.forceError === "malformed") {
    return {
      ok: false,
      live: false,
      shipmentCreated: false,
      gpsInvented: false,
      status: "ERROR",
      reason: "MALFORMED_TRACKING_PAYLOAD",
    };
  }
  if (input.forceError === "timeout") {
    return {
      ok: false,
      live: false,
      shipmentCreated: false,
      gpsInvented: false,
      status: "ERROR",
      reason: "CARRIER_TIMEOUT",
      retryable: true,
    };
  }
  if (input.forceError === "unavailable") {
    return {
      ok: false,
      live: false,
      shipmentCreated: false,
      gpsInvented: false,
      status: "ERROR",
      reason: "CARRIER_UNAVAILABLE",
      retryable: false,
    };
  }
  const requested = String(input.carrier || "dhl").toLowerCase();
  if (requested && !CARRIERS.some((c) => c.id === requested)) {
    return {
      ok: false,
      live: false,
      shipmentCreated: false,
      gpsInvented: false,
      status: "ERROR",
      reason: "CARRIER_UNKNOWN",
      carrier: requested,
    };
  }
  const carrier = classify(requested);
  const estimate = shippingProvider.calculateShipping({
    methodId: input.methodId,
    country: input.country || "DE",
  });
  return {
    ok: true,
    live: false,
    shipmentCreated: false,
    gpsInvented: false,
    trackingNumber: input.trackingNumber || null,
    carrier: carrier.id,
    status: input.trackingNumber ? "UNKNOWN_UNTIL_SCAN" : "NO_TRACKING",
    locationType: "not_available",
    liveGps: false,
    latitude: null,
    longitude: null,
    estimatedDelivery: estimate.estimatedDelivery,
    connector: carrier,
    note: "Scan-based stub only. Estimate is not live GPS.",
  };
}

function pollGps() {
  return {
    ok: false,
    live: false,
    liveGps: false,
    gpsInvented: false,
    coordinates: null,
    reason: "CARRIER_GPS_POLL_BLOCKED",
    note: "Carrier telematics polling is not executed from this adapter.",
  };
}

function purchaseLabel(input = {}) {
  const carrier = classify(String(input.carrier || "dhl").toLowerCase());
  return {
    ok: false,
    purchased: false,
    live: false,
    labelUrl: null,
    trackingNumber: null,
    shipmentCreated: false,
    gpsInvented: false,
    amountCharged: 0,
    reason: "LABEL_PURCHASE_BLOCKED",
    carrier: carrier.id,
    credentialsPresent: carrier.credentialsPresent === true,
    note: "Label purchase is never executed from this adapter. Credentials in env do not authorize a live buy.",
  };
}

function createShipment(input = {}) {
  return {
    ...purchaseLabel(input),
    reason: "SHIPMENT_CREATE_BLOCKED",
    created: false,
  };
}

function confirmLiveLabel() {
  return {
    ok: false,
    live: false,
    liveVerified: false,
    purchased: false,
    reason: "LIVE_LABEL_NOT_CONFIGURED",
    note: "Carrier API key presence is not a purchased label.",
  };
}

function bookPickup() {
  return {
    ok: false,
    live: false,
    booked: false,
    reason: "PICKUP_BOOKING_BLOCKED",
  };
}

function cancelPickup() {
  return {
    ok: false,
    live: false,
    cancelled: false,
    reason: "PICKUP_CANCEL_BLOCKED",
  };
}

function trackLive() {
  return {
    ok: false,
    live: false,
    tracked: false,
    httpAttempted: false,
    reason: "CARRIER_TRACK_LIVE_BLOCKED",
  };
}

function inboundWebhook() {
  return {
    ok: false,
    live: false,
    accepted: false,
    labelCreated: false,
    reason: "CARRIER_INBOUND_WEBHOOK_BLOCKED",
    note: "Inbound carrier webhooks are verified locally at most. They never buy a label.",
  };
}

function quoteRate(input = {}) {
  const quote = shippingProvider.calculateShipping({
    methodId: input.methodId,
    country: input.country || "DE",
    liveRate: true,
  });
  return {
    ...quote,
    live: false,
    liveRate: false,
    carrierHttp: false,
    reason: quote.ok === false ? quote.reason : "LOCAL_SHIPPING_TABLE_ONLY",
  };
}

function health() {
  return {
    codeReady: true,
    liveReady: false,
    shipmentCreateEnabled: false,
    labelPurchaseEnabled: false,
    pickupBookingEnabled: false,
    liveGps: false,
    liveRate: false,
    carriers: listCarriers(),
    provider: shippingProvider.getProviderHealth(),
  };
}

module.exports = {
  CARRIERS,
  classify,
  listCarriers,
  lookup,
  pollGps,
  purchaseLabel,
  createShipment,
  confirmLiveLabel,
  bookPickup,
  cancelPickup,
  trackLive,
  inboundWebhook,
  quoteRate,
  health,
};
