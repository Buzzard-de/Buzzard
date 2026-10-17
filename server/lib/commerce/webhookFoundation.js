/**
 * Part 8 — Payment webhook foundation (signature + idempotency)
 */
const crypto = require("crypto");
const { db } = require("../db");
const { getEffectiveFlags } = require("./commerceFeatureFlags");
const { logSecurityEvent } = require("../securityLog");

function verifySignature(payload, signature, secret, { now = Date.now(), maxAgeSec = 300 } = {}) {
  const check = require("../software/paymentLifecycle").verifyWebhookSignature({
    rawBody: payload,
    signature,
    secret,
    now,
    maxAgeSec,
  });
  return Boolean(check.ok);
}

function redactWebhookPayload(payload) {
  const { redactForLog } = require("../security");
  if (payload == null) return {};
  if (typeof payload !== "object") return { redacted: true };
  return redactForLog(payload);
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
  `).run(id, provider, eventId, eventType, JSON.stringify(redactWebhookPayload(payload)), verified ? 1 : 0);
  return id;
}

function handleWebhook({ provider, eventId, eventType, rawBody, signature, secret, req, now }) {
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
      errorKey: "webhook.blocked",
      status: 403,
      orderCreated: false,
      paymentCreated: false,
      live: false,
    };
  }

  if (!eventId) {
    return { accepted: false, code: "event_id_required", errorKey: "webhook.eventIdRequired", status: 400 };
  }

  const signatureCheck = require("../software/paymentLifecycle").verifyWebhookSignature({
    rawBody,
    signature,
    secret,
    now,
  });
  if (!signatureCheck.ok) {
    logSecurityEvent({
      type: "payment_attempt_blocked",
      success: false,
      detail: { provider, reason: signatureCheck.reason },
    });
    return { accepted: false, code: signatureCheck.reason, errorKey: "webhook.invalidSignature", status: 401 };
  }

  if (isDuplicateWebhook(eventId)) {
    return { accepted: true, duplicate: true, verified: true, status: 200, processed: false, financialEffect: false };
  }

  let payload = {};
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return { accepted: false, code: "invalid_json", errorKey: "webhook.invalidPayload", status: 400 };
  }

  recordWebhookEvent({ provider, eventId, eventType, payload, verified: true });
  return { accepted: true, verified: true, status: 200, processed: false, live: false, note: "Foundation only" };
}

module.exports = {
  verifySignature,
  isDuplicateWebhook,
  recordWebhookEvent,
  redactWebhookPayload,
  handleWebhook,
};
