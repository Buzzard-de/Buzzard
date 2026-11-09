/**
 * Isolated payment webhook verifier. HMAC is integrity, not a digital signature.
 */
const crypto = require("crypto");

function verify({ payload, header, secret, seen = new Set() } = {}) {
  if (!secret) {
    return { ok: false, code: "WEBHOOK_SECRET_REQUIRED", hmacIsSignature: false, live: false };
  }
  if (!header) {
    return { ok: false, code: "MISSING_SIGNATURE", hmacIsSignature: false, live: false };
  }
  const expected = crypto.createHmac("sha256", String(secret)).update(String(payload || ""), "utf8").digest("hex");
  const a = Buffer.from(String(header));
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, code: "INVALID_HMAC", hmacIsSignature: false, live: false };
  }
  const eventId = String(payload || "").slice(0, 64);
  if (seen.has(eventId)) return { ok: false, code: "REPLAY", hmacIsSignature: false, live: false };
  seen.add(eventId);
  return { ok: true, hmacIsSignature: false, live: false, moneyMoved: false, eventId };
}

module.exports = { verify };
