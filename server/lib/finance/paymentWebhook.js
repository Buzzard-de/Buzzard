/**
 * Isolated payment webhook verifier. HMAC is integrity, not a digital signature.
 */
const crypto = require("crypto");
const { recordEvent } = require("./bankingAdapter");

function verify({ payload, header, secret, timestamp } = {}) {
  if (!secret) {
    return { ok: false, code: "WEBHOOK_SECRET_REQUIRED", hmacIsSignature: false, live: false };
  }
  if (!header) {
    return { ok: false, code: "MISSING_SIGNATURE", hmacIsSignature: false, live: false };
  }
  if (timestamp && Math.abs(Date.now() - Number(timestamp)) > 300_000) {
    return { ok: false, code: "TIMESTAMP_SKEW", hmacIsSignature: false, live: false };
  }
  const expected = crypto.createHmac("sha256", String(secret)).update(String(payload || ""), "utf8").digest("hex");
  const a = Buffer.from(String(header));
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, code: "INVALID_HMAC", hmacIsSignature: false, live: false };
  }
  const eventId = crypto.createHash("sha256").update(String(payload || "")).digest("hex");
  const seen = recordEvent(eventId);
  if (seen.replay) return { ok: false, code: "REPLAY", hmacIsSignature: false, live: false };
  return { ok: true, hmacIsSignature: false, live: false, moneyMoved: false, eventId };
}

module.exports = { verify };
