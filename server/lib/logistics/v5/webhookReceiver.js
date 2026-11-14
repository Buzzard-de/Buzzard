/**
 * Carrier webhook receiver. Rejects unsigned and replayed events. No live intake.
 */
const crypto = require("crypto");
const { audit } = require("./auditLog");

const seen = new Map();
const MAX_SKEW_MS = 5 * 60 * 1000;

function signPayload(secret, timestamp, rawBody) {
  return crypto.createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
}

function refused(reason) {
  audit("webhook_rejected", { reason });
  return {
    ok: false,
    signatureVerified: false,
    accepted: false,
    shipped: false,
    delivered: false,
    live: false,
    mock: false,
    status: "BLOCKED_EXTERNAL",
    reason,
    code: reason,
    shipmentCreated: false,
    supplierOrderCreated: false,
    trackingNumber: null,
    supplierOrderNumber: null,
    shipmentId: null,
  };
}

function receiveWebhook({ secret, timestamp, signature, rawBody, eventId, now = Date.now() } = {}) {
  if (!secret || !signature || !timestamp || rawBody == null) return refused("MISSING_SIGNATURE");
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(now - ts) > MAX_SKEW_MS) return refused("TIMESTAMP_SKEW");
  const expected = signPayload(secret, String(timestamp), String(rawBody));
  const a = Buffer.from(String(signature));
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return refused("INVALID_SIGNATURE");
  const nonce = eventId || `${timestamp}:${expected}`;
  if (seen.has(nonce)) return refused("REPLAY");
  seen.set(nonce, now);
  audit("webhook_signature_checked", { eventId: nonce, signatureVerified: true });
  return {
    ok: false,
    signatureVerified: true,
    accepted: false,
    shipped: false,
    delivered: false,
    live: false,
    mock: false,
    status: "BLOCKED_EXTERNAL",
    code: "CARRIER_NOT_LIVE",
    shipmentCreated: false,
    supplierOrderCreated: false,
    orderVerified: false,
    supplierVerified: false,
    trackingNumber: null,
    supplierOrderNumber: null,
    shipmentId: null,
    eventId: nonce,
  };
}

function resetWebhooks() {
  seen.clear();
}

module.exports = { signPayload, receiveWebhook, resetWebhooks };
