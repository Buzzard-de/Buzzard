/**
 * Council messaging. HMAC is integrity, not E2EE.
 */
const crypto = require("crypto");
const { canShare, getMember, CLASSIFICATION } = require("../pusat/council");

function createCouncilChannel({ secret = crypto.randomBytes(32) } = {}) {
  const messages = [];

  function send({ fromId, toId, body, classification = CLASSIFICATION.PUBLIC } = {}) {
    if (!getMember(fromId) || !getMember(toId)) return { ok: false, code: "UNKNOWN_MEMBER" };
    if (!canShare({ fromId, toId, classification })) return { ok: false, code: "SHARE_DENIED" };
    const envelope = {
      id: `msg_${crypto.randomBytes(6).toString("hex")}`,
      fromId,
      toId,
      body,
      classification,
      createdAt: new Date().toISOString(),
    };
    const hmac = crypto.createHmac("sha256", secret).update(JSON.stringify(envelope)).digest("hex");
    const stored = { ...envelope, hmac };
    messages.push(stored);
    return {
      ok: true,
      message: stored,
      e2ee: false,
      transportTls: false,
      integrity: "HMAC-SHA256",
      note: "HMAC is not end-to-end encryption. Server can read plaintext.",
    };
  }

  function verify(message) {
    const { hmac, ...envelope } = message;
    const expected = crypto.createHmac("sha256", secret).update(JSON.stringify(envelope)).digest("hex");
    return { ok: crypto.timingSafeEqual(Buffer.from(hmac, "hex"), Buffer.from(expected, "hex")), e2ee: false };
  }

  return {
    send,
    verify,
    list: () => messages.map((m) => ({ ...m })),
    e2eeClaim: false,
    whatsappRecommended: false,
    architecture: "internal_hmac_store",
  };
}

module.exports = { createCouncilChannel };
