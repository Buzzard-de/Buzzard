/**
 * Unified isolated carrier contract. liveShipment stays false.
 */
const crypto = require("crypto");
const { AB27 } = require("../commerce/ab27Tax");

const STATUSES = Object.freeze(["CREATED", "IN_TRANSIT", "DELAYED", "DELIVERED", "FAILED", "LOST", "RETURNING"]);

function normalizeStatus(raw) {
  const u = String(raw || "").toUpperCase();
  if (STATUSES.includes(u)) return u;
  if (u.includes("LOST")) return "LOST";
  if (u.includes("DELAY")) return "DELAYED";
  if (u.includes("RETURN")) return "RETURNING";
  return "CREATED";
}

function hmac(secret, payload) {
  return crypto.createHmac("sha256", secret).update(String(payload)).digest("hex");
}

function makeAdapter(id) {
  const seen = new Set();
  return {
    id,
    createShipment(req = {}) {
      return {
        ok: false,
        code: "HUMAN_GATE_REQUIRED",
        liveShipment: false,
        label: false,
        carrier: id,
        orderId: req.orderId || null,
      };
    },
    createLabel() {
      return { ok: false, code: "HUMAN_GATE_REQUIRED", liveShipment: false, carrier: id };
    },
    trackShipment({ status = "IN_TRANSIT" } = {}) {
      return {
        ok: true,
        live: false,
        liveShipment: false,
        carrier: id,
        status: normalizeStatus(status),
        events: [{ status: normalizeStatus(status), at: new Date().toISOString() }],
      };
    },
    normalizeStatus,
    cancelShipment() {
      return { ok: false, code: "HUMAN_GATE_REQUIRED", liveShipment: false, carrier: id };
    },
    createReturn() {
      return { ok: false, code: "HUMAN_GATE_REQUIRED", liveShipment: false, carrier: id };
    },
    verifyWebhook({ payload, header, secret, timestamp } = {}) {
      if (!secret) return { ok: false, code: "WEBHOOK_SECRET_REQUIRED", hmacIsSignature: false };
      if (!header) return { ok: false, code: "MISSING_SIGNATURE", hmacIsSignature: false };
      if (timestamp && Math.abs(Date.now() - Number(timestamp)) > 300_000) {
        return { ok: false, code: "TIMESTAMP_SKEW", hmacIsSignature: false };
      }
      const expected = hmac(secret, payload);
      if (expected !== header) return { ok: false, code: "INVALID_HMAC", hmacIsSignature: false };
      if (seen.has(String(payload))) return { ok: false, code: "REPLAY", hmacIsSignature: false };
      seen.add(String(payload));
      return { ok: true, hmacIsSignature: false, live: false, carrier: id };
    },
    reconcileShipment() {
      return { ok: true, matched: 0, live: false, carrier: id };
    },
  };
}

const BRANDS = Object.freeze(["DHL", "DPD", "GLS", "Hermes", "UPS", "AmazonLogistics", "LocalCourier"]);
const POSTS = Object.freeze(AB27.map((cc) => `POST_${cc}`));
const CARRIER_IDS = Object.freeze([...BRANDS, ...POSTS]);
const ADAPTERS = Object.fromEntries(CARRIER_IDS.map((id) => [id, makeAdapter(id)]));

function getAdapter(id) {
  return ADAPTERS[id] || null;
}

function snapshot() {
  return { carriers: [...CARRIER_IDS], live: false, credentialsStored: false, contract: true };
}

module.exports = {
  STATUSES,
  CARRIER_IDS,
  BRANDS,
  POSTS,
  normalizeStatus,
  getAdapter,
  snapshot,
  makeAdapter,
};
