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

function createShipment(req) {
  return getAdapter("DHL").createShipment(req);
}

function createLabel(req) {
  return getAdapter("DHL").createLabel(req);
}

function simulateTrack({ status = "IN_TRANSIT", carrier = "DHL" } = {}) {
  const adapter = getAdapter(carrier) || getAdapter("DHL");
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
