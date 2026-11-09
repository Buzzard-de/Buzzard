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

function receiveWebhook({ secret, timestamp, signature, rawBody, eventId, now = Date.now() } = {}) {
  if (!secret || !signature || !timestamp || rawBody == null) {
    audit("webhook_rejected", { reason: "MISSING_SIGNATURE" });
    return { ok: false, accepted: false, reason: "MISSING_SIGNATURE" };
  }
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(now - ts) > MAX_SKEW_MS) {
    audit("webhook_rejected", { reason: "TIMESTAMP_SKEW" });
    return { ok: false, accepted: false, reason: "TIMESTAMP_SKEW" };
  }
  const expected = signPayload(secret, String(timestamp), String(rawBody));
  const a = Buffer.from(String(signature));
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    audit("webhook_rejected", { reason: "INVALID_SIGNATURE" });
    return { ok: false, accepted: false, reason: "INVALID_SIGNATURE" };
  }
  const nonce = eventId || `${timestamp}:${expected}`;
  if (seen.has(nonce)) {
    audit("webhook_rejected", { reason: "REPLAY" });
    return { ok: false, accepted: false, reason: "REPLAY" };
  }
  seen.set(nonce, now);
  audit("webhook_accepted_mock", { eventId: nonce });
  return { ok: true, accepted: true, live: false, mock: true, eventId: nonce };
}

function resetWebhooks() {
  seen.clear();
}

module.exports = { signPayload, receiveWebhook, resetWebhooks };
