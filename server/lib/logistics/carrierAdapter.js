/**
 * Unified carrier adapter. No live credentials or labels.
 */
const CARRIERS = Object.freeze(["DHL", "Hermes", "DPD", "GLS", "UPS", "AmazonLogistics", "NationalPost", "LocalCourier"]);

function createShipment() {
  return { ok: false, code: "HUMAN_GATE_REQUIRED", liveShipment: false, label: false };
}

function track() {
  return { ok: false, code: "NOT_LIVE", events: [] };
}

function snapshot() {
  return { carriers: [...CARRIERS], live: false, credentialsStored: false };
}

module.exports = { CARRIERS, createShipment, track, snapshot };
