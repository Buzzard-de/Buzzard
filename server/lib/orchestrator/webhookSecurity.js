const crypto = require("crypto");
const { seen, remember } = require("./idempotency");

function verifySignature({ payload, signature, secret }) {
  if (!secret) return { ok: false, code: "WEBHOOK_SECRET_MISSING" };
  const raw = typeof payload === "string" ? payload : JSON.stringify(payload || {});
  const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  const given = String(signature || "").replace(/^sha256=/, "");
  if (!given || given.length !== expected.length) return { ok: false, code: "SIGNATURE_INVALID" };
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  if (!crypto.timingSafeEqual(a, b)) return { ok: false, code: "SIGNATURE_INVALID" };
  return { ok: true };
}

function verifyTimestamp(timestamp, maxSkewMs = 5 * 60 * 1000) {
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return { ok: false, code: "TIMESTAMP_INVALID" };
  if (Math.abs(Date.now() - ts) > maxSkewMs) return { ok: false, code: "TIMESTAMP_STALE" };
  return { ok: true };
}

function acceptEvent({ eventId, payload, signature, timestamp, secret }) {
  const sig = verifySignature({ payload, signature, secret });
  if (!sig.ok) return sig;
  const time = verifyTimestamp(timestamp);
  if (!time.ok) return time;
  if (!eventId) return { ok: false, code: "EVENT_ID_REQUIRED" };
  if (seen("phone_webhook", eventId)) {
    return { ok: true, duplicate: true, code: "REPLAY_PREVENTED" };
  }
  remember("phone_webhook", eventId, { accepted: true });
  return { ok: true, duplicate: false };
}

module.exports = {
  verifySignature,
  verifyTimestamp,
  acceptEvent,
};
