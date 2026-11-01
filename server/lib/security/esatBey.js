/**
 * Esat Bey — defensive security monitor.
 * Complements HMAC, egress, and the sales lock. Not sole defense. Not 24/7 hosted SOC.
 */
const crypto = require("crypto");

const ID = "esat_bey";
const SECRET_HINTS = Object.freeze([
  "private key",
  "password dump",
  "credential exfiltration",
  "unauthorized access",
  "begin rsa private",
  "aws_secret_access_key",
  "sk-ant-",
  "sk-live-",
]);

const ISOLATE_TYPES = Object.freeze([
  "credential_exfiltration",
  "unauthorized_access",
  "EXTERNAL_AI_EGRESS_DENIED",
  "PAYMENT_EGRESS",
  "SECRET_IN_MESSAGE",
  "DUAL_USE_DECLARED",
  "DUAL_USE_HINT",
  "PARTY_NOT_CLEARED",
  "SANCTIONS_UNCERTAIN",
  "OUTSIDE_AB27",
  "HIGH_VALUE",
]);

const events = [];

function resetEsat() {
  events.length = 0;
}

function record({ type, severity = "LOW", action = "RECORD", details = {}, actor = "system" } = {}) {
  const event = {
    id: `esat_${crypto.randomBytes(6).toString("hex")}`,
    type,
    severity,
    action,
    actor,
    details: redact(details),
    at: new Date().toISOString(),
  };
  events.unshift(event);
  if (events.length > 400) events.pop();
  return event;
}

function redact(details) {
  const copy = { ...details };
  for (const key of ["text", "secret", "password", "token", "key"]) {
    if (copy[key]) copy[key] = "[redacted]";
  }
  return copy;
}

function inspect({ type, details = {}, actor = "system" } = {}) {
  const isolate = ISOLATE_TYPES.includes(type);
  const severity = isolate ? "HIGH" : "MEDIUM";
  const action = isolate ? "ISOLATE_AND_HOLD" : "WATCH";
  const event = record({ type, severity, action, details, actor });
  return {
    ok: !isolate,
    allowed: !isolate,
    hold: isolate,
    action,
    severity,
    eventId: event.id,
    reviewer: ID,
    soleDefense: false,
  };
}

function scanText(text, { actor = "system" } = {}) {
  const lowered = String(text || "").toLowerCase();
  const hits = SECRET_HINTS.filter((hint) => lowered.includes(hint));
  if (hits.length) {
    const verdict = inspect({
      type: "SECRET_IN_MESSAGE",
      details: { hits, length: String(text || "").length },
      actor,
    });
    return { safe: false, hits, ...verdict };
  }
  return { safe: true, hits: [], allowed: true, hold: false, action: "ALLOW" };
}

function watchEgress(decision, { url } = {}) {
  if (!decision || decision.allowed) return { allowed: true, hold: false };
  const type =
    decision.code === "EXTERNAL_AI_EGRESS_DENIED"
      ? "EXTERNAL_AI_EGRESS_DENIED"
      : decision.classification === "payment"
        ? "PAYMENT_EGRESS"
        : decision.code || "EGRESS_DENIED";
  return inspect({
    type,
    details: { host: decision.host, code: decision.code, classification: decision.classification, url },
    actor: ID,
  });
}

function watchShareDenied({ fromId, toId, classification } = {}) {
  return inspect({
    type: "SHARE_DENIED",
    details: { fromId, toId, classification },
    actor: fromId || "unknown",
  });
}

function watchComplianceHold({ code, destination } = {}) {
  return inspect({
    type: code || "SANCTIONS_UNCERTAIN",
    details: { destination, code },
    actor: "compliance_ai",
  });
}

function recent(limit = 20) {
  return events.slice(0, Math.max(1, Number(limit) || 20)).map((e) => ({ ...e }));
}

function status() {
  return {
    id: ID,
    name: "Esat Bey",
    active: true,
    used: true,
    soleDefense: false,
    liveVerified: false,
    completeClaim: false,
    acceptanceStatus: "CODE_READY",
    eventCount: events.length,
    lastEvent: events[0] ? { id: events[0].id, type: events[0].type, severity: events[0].severity } : null,
    note: "In-process defensive monitor. HMAC, egress, and sales lock remain independent layers.",
  };
}

module.exports = {
  ID,
  inspect,
  scanText,
  watchEgress,
  watchShareDenied,
  watchComplianceHold,
  recent,
  status,
  resetEsat,
  SECRET_HINTS,
};
