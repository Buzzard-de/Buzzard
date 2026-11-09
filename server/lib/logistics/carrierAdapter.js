/**
 * Unified carrier adapter. No live credentials or labels.
 */
const CARRIERS = Object.freeze(["DHL", "Hermes", "DPD", "GLS", "UPS", "AmazonLogistics", "NationalPost", "LocalCourier"]);

function createShipment() {
  return { ok: false, code: "HUMAN_GATE_REQUIRED", liveShipment: false, label: false };
}

const STATUSES = Object.freeze(["CREATED", "IN_TRANSIT", "DELAYED", "DELIVERED", "FAILED", "LOST", "RETURNING"]);

function normalizeStatus(raw) {
  const u = String(raw || "").toUpperCase();
  if (STATUSES.includes(u)) return u;
  if (u.includes("LOST")) return "LOST";
  if (u.includes("DELAY")) return "DELAYED";
  if (u.includes("RETURN")) return "RETURNING";
  return "CREATED";
}

function simulateTrack({ status = "IN_TRANSIT" } = {}) {
  return {
    ok: true,
    live: false,
    status: normalizeStatus(status),
    events: [{ status: normalizeStatus(status), at: new Date().toISOString() }],
    label: false,
  };
}

function track() {
  return { ok: false, code: "NOT_LIVE", events: [] };
}

function snapshot() {
  return { carriers: [...CARRIERS], live: false, credentialsStored: false };
}

module.exports = { CARRIERS, STATUSES, createShipment, track, simulateTrack, normalizeStatus, snapshot };
