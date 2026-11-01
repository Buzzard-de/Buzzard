/**
 * Internal AI messaging.
 * HMAC = integrity of metadata.
 * e2e=true only when payload is X25519-sealed and plaintext is not archived.
 */
const crypto = require("crypto");
const { canShare } = require("../pusat/council");
const { seal, open } = require("./e2eBox");

const DEV_PLACEHOLDER = "dev-only-not-for-production";
const PRODUCTION_MIN_LENGTH = 32;

function isProductionLock() {
  return process.env.NODE_ENV === "production" || process.env.BUZZARD_PRODUCTION === "1";
}

function resolveHmacSecret(passed) {
  const envSecret = process.env.BUZZARD_MSG_HMAC;
  if (isProductionLock()) {
    if (!envSecret || envSecret === DEV_PLACEHOLDER || envSecret.length < PRODUCTION_MIN_LENGTH) {
      return { ok: false, code: "HMAC_PRODUCTION_LOCK" };
    }
    return { ok: true, secret: envSecret };
  }
  const secret = passed === undefined ? envSecret : passed;
  if (!secret || secret === DEV_PLACEHOLDER) {
    return { ok: false, code: "HMAC_SECRET_REQUIRED" };
  }
  return { ok: true, secret };
}

function createMessenger({ secret } = {}) {
  const archive = [];
  const resolved = resolveHmacSecret(secret);
  const configuredSecret = resolved.ok ? resolved.secret : null;
  const lockCode = resolved.ok ? null : resolved.code;

  function sign(body) {
    return crypto.createHmac("sha256", configuredSecret).update(body).digest("hex");
  }

  function send({
    fromId,
    toId,
    text,
    classification = "public",
    attachment = null,
    senderPrivateKey = null,
    recipientPublicKey = null,
  } = {}) {
    if (!configuredSecret) {
      return { ok: false, code: lockCode || "HMAC_SECRET_REQUIRED", e2e: false };
    }
    if (!canShare({ fromId, toId, classification })) {
      return { ok: false, code: "SHARE_DENIED" };
    }
    const useE2e = Boolean(senderPrivateKey && recipientPublicKey);
    const box = useE2e ? seal(text, senderPrivateKey, recipientPublicKey) : null;
    const body = JSON.stringify({
      fromId,
      toId,
      classification,
      e2e: useE2e,
      attachment: attachment ? attachment.name : null,
    });
    const message = {
      id: `msg_${crypto.randomBytes(6).toString("hex")}`,
      fromId,
      toId,
      classification,
      attachment: attachment
        ? { name: attachment.name, kind: attachment.kind || "file", bytes: attachment.bytes || 0 }
        : null,
      text: useE2e ? null : text,
      box,
      hmac: sign(body),
      e2e: useE2e,
      at: new Date().toISOString(),
    };
    archive.push(message);
    return { ok: true, message, e2e: useE2e };
  }

  function verify(message) {
    const body = JSON.stringify({
      fromId: message.fromId,
      toId: message.toId,
      classification: message.classification,
      e2e: Boolean(message.e2e),
      attachment: message.attachment ? message.attachment.name : null,
    });
    return sign(body) === message.hmac;
  }

  function decrypt(message, recipientPrivateKey, senderPublicKey) {
    if (!message.e2e || !message.box) return { ok: false, code: "NOT_E2E" };
    return { ok: true, text: open(message.box, recipientPrivateKey, senderPublicKey) };
  }

  return {
    send,
    verify,
    decrypt,
    archive: () => archive.map((m) => ({ ...m })),
    e2eAssessment: {
      serverStored: true,
      endToEnd: true,
      plaintextOnServer: false,
      residualRisks: ["device access", "export of private keys", "backups of ciphertext", "notifications"],
    },
  };
}

module.exports = { createMessenger, resolveHmacSecret, PRODUCTION_MIN_LENGTH };
