/**
 * Esat Bey local defense helpers used by Guardian and Pusat lifecycle.
 * Deny/fail-closed only. No autonomous destructive containment.
 * Rule-based. Not a live SOC/SIEM. Not an ML anomaly product.
 */

const crypto = require("crypto");
const { EXCEPTION_CODES, RISK_LEVEL } = require("./constants");

const POLICY_VERSION = "esat.policy.v2";
const POLICY_SOURCE = "code";

const isolatedAgents = new Set();
const incidents = [];
const metricHits = new Map();
const callBudget = new Map();
let lastAuditWriteOk = true;
let monitoringHealthy = true;

const EVENT_CLASS = Object.freeze({
  OBSERVATION: "observation",
  SUSPICIOUS: "suspicious",
  CONFIRMED_VIOLATION: "confirmed_violation",
});

const PROMPT_INJECTION =
  /ignore\s+(all\s+)?(previous|prior)\s+instructions|disregard\s+your\s+(system|safety)\s+prompt|you\s+are\s+now\s+(the\s+)?system/i;

const EXFIL_PATTERN =
  /(exfiltrat|webhook\.site|pastebin\.com|send\s+(the\s+)?(secrets?|api keys?|tokens?)\s+to)/i;

const PRIVILEGE_ESCALATION_KEYS =
  /^(permissions|permissionsRequired|grantRole|roles|impersonate|escalate|policyVersion|securityPolicy)$/i;

const CONFIG_MUTATION_KEYS =
  /^(BUZZARD_SALES_ENABLED|BUZZARD_LIVE_PAYMENTS|BUZZARD_PRODUCT_SOT_ACTIVE|featureFlags)$/;

const MONEY_ACTIONS = new Set([
  "payment.charge",
  "payment.capture",
  "payment.refund",
  "purchase.supplier",
  "refund.issue",
  "supplier.order.submit",
]);

const ANOMALY_THRESHOLDS = Object.freeze({
  agentCallsPerMinute: 40,
  failedAuthPerMinute: 12,
  taskVolumePerMinute: 80,
  repeatedTaskPerMinute: 20,
  externalErrorsPerMinute: 15,
});

function walkFindings(value, onString, onKey, depth = 0, seen = new WeakSet()) {
  if (depth > 8 || value == null) return;
  if (typeof value === "string") {
    onString(value);
    return;
  }
  if (typeof value !== "object") return;
  if (seen.has(value)) return;
  seen.add(value);
  if (Array.isArray(value)) {
    for (const item of value) walkFindings(item, onString, onKey, depth + 1, seen);
    return;
  }
  for (const [key, nested] of Object.entries(value)) {
    onKey(key);
    walkFindings(nested, onString, onKey, depth + 1, seen);
  }
}

function inspectUntrustedPayload(payload) {
  const findings = [];
  walkFindings(
    payload,
    (text) => {
      if (PROMPT_INJECTION.test(text)) findings.push("prompt_injection");
      if (EXFIL_PATTERN.test(text)) findings.push("exfiltration");
    },
    (key) => {
      if (PRIVILEGE_ESCALATION_KEYS.test(key)) findings.push("privilege_escalation");
      if (CONFIG_MUTATION_KEYS.test(key)) findings.push("config_mutation");
    }
  );
  return [...new Set(findings)];
}

function isolateAgent(agentId) {
  const id = String(agentId || "").trim();
  if (id) isolatedAgents.add(id);
  return { isolated: isolatedAgents.has(id), grantedPermissions: [] };
}

function clearIsolation(agentId) {
  if (agentId) isolatedAgents.delete(String(agentId));
  else isolatedAgents.clear();
}

function isIsolated(agentId) {
  return isolatedAgents.has(String(agentId || ""));
}

function isMoneyAction(action) {
  return MONEY_ACTIONS.has(String(action || ""));
}

function failClosedDenial(code = EXCEPTION_CODES.GUARDIAN_BLOCKED, extra = {}) {
  return {
    ok: false,
    allowed: false,
    failClosed: true,
    policyVersion: POLICY_VERSION,
    code,
    riskLevel: extra.riskLevel || RISK_LEVEL.HIGH,
    requireApproval: true,
    ...extra,
  };
}

function classifyEvent(reason, { repeats = 0 } = {}) {
  if (reason === "rate_limit" || reason === "circuit_open" || reason === "external_error") {
    return EVENT_CLASS.OBSERVATION;
  }
  if (reason === "prompt_injection" || reason === "privilege_escalation" || reason === "exfiltration" || reason === "config_mutation") {
    return repeats >= 3 ? EVENT_CLASS.CONFIRMED_VIOLATION : EVENT_CLASS.SUSPICIOUS;
  }
  if (reason === "approval_bypass" || reason === "self_approval") {
    return EVENT_CLASS.CONFIRMED_VIOLATION;
  }
  return EVENT_CLASS.SUSPICIOUS;
}

function recordIncident({
  reason,
  component = "esat_bey",
  severity = "HIGH",
  evidenceRef = null,
  actorId = null,
  repeats = 0,
} = {}) {
  const classification = classifyEvent(reason, { repeats });
  const incident = {
    id: `inc_${crypto.randomBytes(6).toString("hex")}`,
    at: new Date().toISOString(),
    component,
    actorId,
    reason,
    severity,
    classification,
    evidenceRef,
    policyVersion: POLICY_VERSION,
    liveSoc: false,
    siem: false,
    dispatched: false,
  };
  incidents.push(incident);
  if (incidents.length > 500) incidents.shift();
  return incident;
}

function listIncidents() {
  return incidents.slice();
}

function markAuditWrite(ok) {
  lastAuditWriteOk = Boolean(ok);
  monitoringHealthy = lastAuditWriteOk;
}

function getEsatHealth() {
  return {
    policyVersion: POLICY_VERSION,
    policySource: POLICY_SOURCE,
    policyLoaded: true,
    monitoringHealthy,
    lastAuditWriteOk,
    liveSoc: false,
    siem: false,
    mlAnomaly: false,
    ruleBasedAnomaly: true,
    liveAlertDispatch: false,
    incidentCount: incidents.length,
  };
}

function observeMetric(name, increment = 1) {
  const now = Date.now();
  const windowMs = 60_000;
  const list = (metricHits.get(name) || []).filter((t) => now - t < windowMs);
  for (let i = 0; i < increment; i += 1) list.push(now);
  metricHits.set(name, list);
  const threshold = ANOMALY_THRESHOLDS[name] || 50;
  const count = list.length;
  const anomalous = count > threshold;
  return {
    ml: false,
    ruleBased: true,
    metric: name,
    count,
    threshold,
    anomalous,
    classification: anomalous ? EVENT_CLASS.OBSERVATION : "normal",
  };
}

function allowAgentBudget(agentId, { maxPerWindow = 60 } = {}) {
  const key = String(agentId || "unknown");
  const now = Date.now();
  const list = (callBudget.get(key) || []).filter((t) => now - t < 60_000);
  list.push(now);
  callBudget.set(key, list);
  if (list.length > maxPerWindow) {
    return { allowed: false, reason: "AGENT_BUDGET_EXCEEDED", count: list.length, estimatedCost: false };
  }
  return { allowed: true, count: list.length, estimatedCost: false };
}

function securityMemoryMayChangePolicy() {
  return false;
}

function memoryLooksLikePolicyChange(content) {
  const findings = inspectUntrustedPayload(content);
  return findings.includes("privilege_escalation") || findings.includes("config_mutation");
}

function resetEsatState() {
  isolatedAgents.clear();
  incidents.length = 0;
  metricHits.clear();
  callBudget.clear();
  lastAuditWriteOk = true;
  monitoringHealthy = true;
}

function wrapApprovalCall(fn) {
  try {
    return fn();
  } catch {
    return failClosedDenial(EXCEPTION_CODES.APPROVAL_INVALID, {
      reason: "approval_unavailable",
      requireApproval: true,
    });
  }
}

module.exports = {
  POLICY_VERSION,
  EVENT_CLASS,
  ANOMALY_THRESHOLDS,
  inspectUntrustedPayload,
  isolateAgent,
  clearIsolation,
  isIsolated,
  isMoneyAction,
  failClosedDenial,
  classifyEvent,
  recordIncident,
  listIncidents,
  markAuditWrite,
  getEsatHealth,
  observeMetric,
  allowAgentBudget,
  securityMemoryMayChangePolicy,
  memoryLooksLikePolicyChange,
  resetEsatState,
  wrapApprovalCall,
  PROMPT_INJECTION,
};
