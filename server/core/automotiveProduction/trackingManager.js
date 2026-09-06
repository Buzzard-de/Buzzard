/**
 * Automotive Production Integration — tracking manager (carrier-agnostic).
 */
const { recordIntegrationAudit } = require("./integrationAudit");

const CARRIERS = Object.freeze(["DHL", "DPD", "Hermes", "GLS", "UPS", "FedEx", "MOCK"]);

function normalizeTracking(raw = {}) {
  return {
    trackingNumber: raw.trackingNumber || raw.tracking_number || null,
    carrier: (raw.carrier || "MOCK").toUpperCase(),
    status: raw.status || "UNKNOWN",
    events: (raw.events || []).map((e) => ({
      timestamp: e.timestamp || e.date,
      location: e.location || null,
      description: e.description || e.status,
    })),
    estimatedDelivery: raw.estimatedDelivery || raw.eta || null,
    lastUpdated: raw.lastUpdated || new Date().toISOString(),
  };
}

function createMockTracking(trackingNumber, carrier = "MOCK") {
  return normalizeTracking({
    trackingNumber,
    carrier,
    status: "IN_TRANSIT",
    events: [
      { timestamp: new Date().toISOString(), description: "Shipment created (mock)" },
    ],
    estimatedDelivery: new Date(Date.now() + 3 * 86400000).toISOString(),
  });
}

function getTracking(trackingNumber, carrier = "MOCK") {
  return {
    ok: true,
    mode: "mock",
    tracking: createMockTracking(trackingNumber, carrier),
  };
}

function updateOrderTracking(orderId, tracking = {}) {
  const normalized = normalizeTracking(tracking);
  recordIntegrationAudit({
    action: "TRACKING_UPDATED",
    entityId: orderId,
    metadata: { carrier: normalized.carrier, status: normalized.status },
  });
  return { orderId, tracking: normalized, updated: true };
}

module.exports = {
  CARRIERS,
  normalizeTracking,
  createMockTracking,
  getTracking,
  updateOrderTracking,
};
