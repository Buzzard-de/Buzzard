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
  "SALES_UNLOCK_ATTEMPT",
  "PAYMENT_CAPTURE",
  "TAX_PAYMENT",
  "PRODUCTION_RESTORE",
  "REFUSE_PRODUCTION_RESTORE",
  "REFUSE_LIVE_DB",
  "EXTERNAL_AI_FORBIDDEN",
  "SECURITY_ALERT",
  "PERMISSION_DENIED",
  "COUNTRY_CROSS_SHARE",
  "PHISHING_AUTHORITY",
]);

const HOOKS = Object.freeze([
  "egress",
  "messaging",
  "sanctions",
  "sales_gate",
  "payment_capture",
  "tax_pay",
  "external_ai",
  "restore",
  "exception_bus",
  "country_vault",
  "authority_gate",
  "backup_lock",
]);

let activated = false;

const events = [];

function resetEsat() {
  events.length = 0;
  activated = false;
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
  persist(event);
  return event;
}

function persist(event) {
  try {
    const { db } = require("../db");
    db.exec(`
      CREATE TABLE IF NOT EXISTS esat_security_events (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        severity TEXT NOT NULL,
        action TEXT NOT NULL,
        actor TEXT,
        details_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);
    db.prepare(
      `INSERT OR IGNORE INTO esat_security_events (id, type, severity, action, actor, details_json, created_at)
       VALUES (?,?,?,?,?,?,?)`
    ).run(event.id, event.type, event.severity, event.action, event.actor, JSON.stringify(event.details), event.at);
  } catch {
    /* memory remains the live path if sqlite is busy or missing */
  }
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

function watchSalesAttempt(gate = {}) {
  if (gate.envWantsSales && !gate.allowed) {
    return inspect({ type: "SALES_UNLOCK_ATTEMPT", details: { failed: gate.failed }, actor: "sales_gate" });
  }
  return { allowed: true, hold: false };
}

function watchPaymentCapture(id) {
  return inspect({ type: "PAYMENT_CAPTURE", details: { id }, actor: "payment_sandbox" });
}

function watchTaxPay({ country, amount } = {}) {
  return inspect({ type: "TAX_PAYMENT", details: { country, amount }, actor: "tax_pools" });
}

function watchExternalAi(provider) {
  return inspect({ type: "EXTERNAL_AI_FORBIDDEN", details: { provider }, actor: "ai_providers" });
}

function watchRestore(code, target) {
  return inspect({ type: code || "PRODUCTION_RESTORE", details: { target }, actor: "restore" });
}

function watchException({ type, severity, source } = {}) {
  if (type !== "SECURITY_ALERT" && type !== "PERMISSION_DENIED") {
    return { allowed: true, hold: false };
  }
  return inspect({ type, details: { source, exceptionType: type }, actor: source || "exception_bus" });
}

function activate() {
  if (!activated) {
    activated = true;
    record({ type: "ESAT_ACTIVE", severity: "INFO", action: "WATCH", details: { hooks: HOOKS }, actor: ID });
  }
  return status();
}

function status() {
  const holds = events.filter((e) => e.action === "ISOLATE_AND_HOLD").length;
  return {
    id: ID,
    name: "Esat Bey",
    active: true,
    used: true,
    activated,
    soleDefense: false,
    liveVerified: false,
    completeClaim: false,
    acceptanceStatus: "CODE_READY",
    hooks: HOOKS,
    eventCount: events.length,
    holdCount: holds,
    lastEvent: events[0] ? { id: events[0].id, type: events[0].type, severity: events[0].severity } : null,
    note: "Active in-process defense. Not a hosted 24/7 SOC. HMAC, egress, and sales lock stay independent.",
  };
}

module.exports = {
  ID,
  inspect,
  scanText,
  watchEgress,
  watchShareDenied,
  watchComplianceHold,
  watchSalesAttempt,
  watchPaymentCapture,
  watchTaxPay,
  watchExternalAi,
  watchRestore,
  watchException,
  activate,
  recent,
  status,
  resetEsat,
  SECRET_HINTS,
  HOOKS,
};
