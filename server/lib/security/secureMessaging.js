/**
 * Internal AI messaging. Integrity via HMAC. Not claimed as device-level E2E.
 */
const crypto = require("crypto");
const { canShare } = require("../pusat/council");

function createMessenger({ secret = process.env.BUZZARD_MSG_HMAC || "dev-only-not-for-production" } = {}) {
  const archive = [];

  function sign(body) {
    return crypto.createHmac("sha256", secret).update(body).digest("hex");
  }

  function send({ fromId, toId, text, classification = "public", attachment = null } = {}) {
    if (!canShare({ fromId, toId, classification })) {
      return { ok: false, code: "SHARE_DENIED" };
    }
    const body = JSON.stringify({ fromId, toId, text, classification, attachment: attachment ? attachment.name : null });
    const message = {
      id: `msg_${crypto.randomBytes(6).toString("hex")}`,
      fromId,
      toId,
      text,
      classification,
      attachment: attachment
        ? { name: attachment.name, kind: attachment.kind || "file", bytes: attachment.bytes || 0 }
        : null,
      hmac: sign(body),
      at: new Date().toISOString(),
    };
    archive.push(message);
    return { ok: true, message, e2e: false };
  }

  function verify(message) {
    const body = JSON.stringify({
      fromId: message.fromId,
      toId: message.toId,
      text: message.text,
      classification: message.classification,
      attachment: message.attachment ? message.attachment.name : null,
    });
    return sign(body) === message.hmac;
  }

  return {
    send,
    verify,
    archive: () => archive.map((m) => ({ ...m })),
    e2eAssessment: {
      serverStored: true,
      endToEnd: false,
      residualRisks: ["device access", "export", "backups", "notifications"],
    },
  };
}

module.exports = { createMessenger };
