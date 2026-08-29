/**
 * Part 8 — Payment webhook foundation (signature + idempotency)
 */
const crypto = require("crypto");
const { db } = require("../db");
const { getEffectiveFlags } = require("./commerceFeatureFlags");
const { logSecurityEvent } = require("../securityLog");

function verifySignature(payload, signature, secret) {
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  if (signature.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

function isDuplicateWebhook(eventId) {
  const row = db.prepare("SELECT id FROM commerce_webhook_events WHERE event_id = ?").get(eventId);
  return Boolean(row);
}

function recordWebhookEvent({ provider, eventId, eventType, payload, verified }) {
  const id = `wh_${crypto.randomBytes(6).toString("hex")}`;
  db.prepare(`
    INSERT INTO commerce_webhook_events(id, provider, event_id, event_type, payload_json, verified)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, provider, eventId, eventType, JSON.stringify(payload || {}), verified ? 1 : 0);
  return id;
}

function handleWebhook({ provider, eventId, eventType, rawBody, signature, secret, req }) {
  const flags = getEffectiveFlags();

  if (!flags.salesEnabled || !flags.paymentEnabled) {
    logSecurityEvent({
      type: "payment_attempt_blocked",
      success: false,
      path: req?.url,
      detail: { provider, eventType, reason: "sales_or_payment_disabled" },
    });
    return {
      accepted: false,
      code: "webhook_blocked",
      message: "Webhooks cannot create real orders/payments while sales disabled",
      status: 403,
      orderCreated: false,
      paymentCreated: false,
    };
  }

  if (isDuplicateWebhook(eventId)) {
    return { accepted: true, duplicate: true, status: 200 };
  }

  const verified = verifySignature(rawBody, signature, secret);
  if (!verified) {
    logSecurityEvent({ type: "payment_attempt_blocked", success: false, detail: { provider, reason: "bad_signature" } });
    return { accepted: false, code: "invalid_signature", status: 401 };
  }

  recordWebhookEvent({ provider, eventId, eventType, payload: JSON.parse(rawBody || "{}"), verified });
  return { accepted: true, verified: true, status: 200, processed: false, note: "Foundation only" };
}

module.exports = {
  verifySignature,
  isDuplicateWebhook,
  recordWebhookEvent,
  handleWebhook,
};
