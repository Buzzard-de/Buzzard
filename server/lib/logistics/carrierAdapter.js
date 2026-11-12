/**
 * Compatibility facade over the unified carrier contract.
 */
const {
  CARRIER_IDS,
  STATUSES,
  getAdapter,
  normalizeStatus,
  snapshot,
} = require("./carrierContract");

const CARRIERS = CARRIER_IDS;

function createShipment(req = {}) {
  const id = req.carrier || req.carrierId;
  const adapter = id ? getAdapter(id) : null;
  if (!adapter) {
    return { ok: false, code: "CARRIER_UNKNOWN", liveShipment: false, label: false, carrier: id || null };
  }
  return adapter.createShipment(req);
}

function createLabel(req = {}) {
  const id = req.carrier || req.carrierId;
  const adapter = id ? getAdapter(id) : null;
  if (!adapter) {
    return { ok: false, code: "CARRIER_UNKNOWN", liveShipment: false, label: false, carrier: id || null };
  }
  return adapter.createLabel(req);
}

function simulateTrack({ status = "IN_TRANSIT", carrier } = {}) {
  const adapter = carrier ? getAdapter(carrier) : null;
  if (!adapter) {
    return {
      ok: false,
      live: false,
      liveShipment: false,
      carrier: null,
      status: normalizeStatus(status),
      providerStatus: String(status),
      simulated: true,
    };
  }
  return adapter.trackShipment({ status });
}

function track() {
  return { ok: false, code: "NOT_LIVE", events: [] };
}

module.exports = {
  CARRIERS,
  STATUSES,
  createShipment,
  createLabel,
  track,
  simulateTrack,
  normalizeStatus,
  snapshot,
  getAdapter,
};
