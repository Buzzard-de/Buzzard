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
  const carrier = classify(String(input.carrier || "dhl").toLowerCase());
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
    estimatedDelivery: estimate.estimatedDelivery,
    connector: carrier,
    note: "Scan-based stub only. Estimate is not live GPS.",
  };
}

function health() {
  return {
    codeReady: true,
    liveReady: false,
    shipmentCreateEnabled: false,
    carriers: listCarriers(),
    provider: shippingProvider.getProviderHealth(),
  };
}

module.exports = {
  CARRIERS,
  classify,
  listCarriers,
  lookup,
  health,
};
