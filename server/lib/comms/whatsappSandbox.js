/**
 * Pusat WhatsApp sandbox. Inbound verify only. Does not send, migrate, or touch personal chats.
 */
const crypto = require("crypto");
const { createMultiMemory } = require("../buzzardNative/core/multiMemory");

const seen = new Set();
const mem = createMultiMemory();

function status() {
  return {
    connected: false,
    liveAccount: false,
    numberMigrated: false,
    messagesSent: 0,
    personalNumberPreserved: true,
    backupsUntouched: true,
  };
}

function send() {
  return { ok: false, code: "WHATSAPP_SEND_DENIED", sent: false, live: false };
}

function migrateNumber() {
  return { ok: false, code: "NUMBER_MIGRATION_DENIED" };
}

function verifyInbound({ payload, header, secret, timestamp } = {}) {
  if (!secret) return { ok: false, code: "WEBHOOK_SECRET_REQUIRED", sent: false };
  if (!header) return { ok: false, code: "MISSING_SIGNATURE", sent: false };
  if (timestamp && Math.abs(Date.now() - Number(timestamp)) > 300_000) {
    return { ok: false, code: "TIMESTAMP_SKEW", sent: false };
  }
  const expected = crypto.createHmac("sha256", String(secret)).update(String(payload || "")).digest("hex");
  if (expected !== header) return { ok: false, code: "INVALID_HMAC", sent: false, hmacIsSignature: false };
  const eventId = crypto.createHash("sha256").update(String(payload || "")).digest("hex");
  if (seen.has(eventId)) return { ok: false, code: "REPLAY", sent: false };
  seen.add(eventId);
  let body = {};
  try {
    body = JSON.parse(payload);
  } catch {
    return { ok: false, code: "INVALID_PAYLOAD", sent: false };
  }
  const from = body.from || "unknown";
  const text = String(body.text || "");
  mem.put({
    actorId: "banu_hanim",
    ownerId: "banu_hanim",
    type: "personal",
    key: `wa:${from}`,
    value: { text, at: new Date().toISOString() },
  });
  return {
    ok: true,
    sent: false,
    live: false,
    hmacIsSignature: false,
    conversationId: `wa:${from}`,
    namespace: "memory/banu/",
    normalized: { from, text },
    outbound: send(),
  };
}

module.exports = { status, send, migrateNumber, verifyInbound };
