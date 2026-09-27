/**
 * In-process event bus. Idempotent by event_id. Not a fake external broker.
 */
const crypto = require("crypto");
const { db } = require("./db");

const listeners = new Map();

function on(type, handler) {
  if (!listeners.has(type)) listeners.set(type, []);
  listeners.get(type).push(handler);
}

function emit({ type, payload = {}, correlationId = null, idempotencyKey = null } = {}) {
  if (!type) throw new Error("event type required");
  const id = idempotencyKey || `evt_${crypto.randomBytes(8).toString("hex")}`;
  const existing = db.prepare("SELECT id FROM system_events WHERE id = ?").get(id);
  if (existing) {
    return { id, duplicate: true, type };
  }
  db.prepare(
    `
    INSERT INTO system_events(id, type, payload_json, correlation_id)
    VALUES (?,?,?,?)
  `
  ).run(id, type, JSON.stringify(payload), correlationId);
  const handlers = listeners.get(type) || [];
  for (const handler of handlers) {
    try {
      handler({ id, type, payload, correlationId });
    } catch {
      /* handlers must not break emit */
    }
  }
  return { id, duplicate: false, type };
}

module.exports = { on, emit };
