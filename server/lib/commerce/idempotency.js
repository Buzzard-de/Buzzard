/**
 * Part 8 — Idempotency foundation for checkout/order/payment
 */
const crypto = require("crypto");
const { db } = require("../db");

const DEFAULT_TTL_HOURS = 24;

function hashKey(key) {
  return crypto.createHash("sha256").update(String(key)).digest("hex");
}

function payloadHash(payload) {
  return crypto.createHash("sha256").update(JSON.stringify(payload ?? null)).digest("hex");
}

function storeIdempotency({ key, scope, resourceId, response, ttlHours = DEFAULT_TTL_HOURS, payload = null }) {
  const keyHash = hashKey(`${scope}:${key}`);
  const expiresAt = new Date(Date.now() + ttlHours * 3600 * 1000).toISOString();
  db.prepare(`
    INSERT INTO commerce_idempotency(key_hash, scope, resource_id, response_json, expires_at, payload_hash)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(key_hash) DO NOTHING
  `).run(keyHash, scope, resourceId || null, JSON.stringify(response), expiresAt, payload == null ? null : payloadHash(payload));
  return keyHash;
}

function getIdempotency({ key, scope }) {
  const keyHash = hashKey(`${scope}:${key}`);
  const row = db
    .prepare(`
      SELECT * FROM commerce_idempotency
      WHERE key_hash = ? AND scope = ? AND expires_at > datetime('now')
    `)
    .get(keyHash, scope);
  if (!row) return null;
  try {
    return {
      keyHash,
      resourceId: row.resource_id,
      response: JSON.parse(row.response_json || "{}"),
      payloadHash: row.payload_hash || null,
      replay: true,
    };
  } catch {
    return null;
  }
}

function withIdempotency({ key, scope, handler, req, payload = null }) {
  if (!key) return handler({ replay: false });

  const existing = getIdempotency({ key, scope });
  if (existing) {
    if (payload != null && existing.payloadHash && existing.payloadHash !== payloadHash(payload)) {
      const exceptions = require("../exceptionBus");
      exceptions.emit({
        type: exceptions.TYPES.ORDER_IDEMPOTENCY_CONFLICT,
        source: "idempotency",
        entity: "order",
        message: "Idempotency key reused with a different payload",
        retryable: false,
      });
      return {
        error: "idempotency_payload_conflict",
        code: "ORDER_IDEMPOTENCY_CONFLICT",
        status: 409,
      };
    }
    const { logSecurityEvent } = require("../securityLog");
    logSecurityEvent({
      type: "idempotency_conflict",
      success: true,
      path: req?.url,
      detail: { scope, replay: true },
    });
    return { ...existing.response, idempotencyReplay: true };
  }

  const result = handler({ replay: false });
  storeIdempotency({
    key,
    scope,
    resourceId: result?.id || result?.checkoutId || result?.orderId,
    response: result,
    payload,
  });
  return result;
}

function purgeExpired() {
  return db.prepare("DELETE FROM commerce_idempotency WHERE expires_at <= datetime('now')").run().changes;
}

module.exports = {
  hashKey,
  payloadHash,
  storeIdempotency,
  getIdempotency,
  withIdempotency,
  purgeExpired,
};
