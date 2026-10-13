/**
 * Explicit Pusat event producer/consumer contract.
 * Not a second orchestrator.
 */

const crypto = require("crypto");
const controlCenter = require("../controlCenter");

const SCHEMA_VERSION = 1;
const KNOWN_TYPES = Object.freeze([
  "pusat.task.submitted",
  "pusat.task.completed",
  "pusat.scheduler.enqueued",
  "pusat.circuit.changed",
  "payment.official.applied",
]);

function produce(eventType, payload = {}, { actorId = "pusat" } = {}) {
  if (!KNOWN_TYPES.includes(eventType)) {
    return { ok: false, reason: "UNKNOWN_EVENT_TYPE", eventType };
  }
  const event = {
    id: `pev_${crypto.randomBytes(8).toString("hex")}`,
    schemaVersion: SCHEMA_VERSION,
    eventType,
    payload,
    producedAt: new Date().toISOString(),
  };
  controlCenter.recordSystemEvent({
    eventType,
    actorType: "pusat",
    actorId,
    resourceType: "event",
    resourceId: event.id,
    summary: eventType,
    metadata: { schemaVersion: SCHEMA_VERSION, payload },
  });
  return { ok: true, event };
}

function consume(event, handler) {
  if (!event || event.schemaVersion !== SCHEMA_VERSION) {
    return { ok: false, reason: "SCHEMA_MISMATCH" };
  }
  if (!KNOWN_TYPES.includes(event.eventType)) {
    return { ok: false, reason: "UNKNOWN_EVENT_TYPE" };
  }
  if (typeof handler !== "function") {
    return { ok: false, reason: "HANDLER_REQUIRED" };
  }
  const result = handler(event);
  return { ok: true, result, suggestionOnly: result?.execute !== true };
}

module.exports = {
  SCHEMA_VERSION,
  KNOWN_TYPES,
  produce,
  consume,
};
