/**
 * Esat Bey local defense helpers used by Guardian and Pusat lifecycle.
 * Deny/fail-closed only. No autonomous destructive containment.
 */

const { EXCEPTION_CODES, RISK_LEVEL } = require("./constants");

const isolatedAgents = new Set();

const PROMPT_INJECTION =
  /ignore\s+(all\s+)?(previous|prior)\s+instructions|disregard\s+your\s+(system|safety)\s+prompt|you\s+are\s+now\s+(the\s+)?system/i;

const PRIVILEGE_ESCALATION_KEYS = /^(permissions|permissionsRequired|grantRole|roles|impersonate|escalate)$/i;

const MONEY_ACTIONS = new Set([
  "payment.charge",
  "payment.capture",
  "payment.refund",
  "purchase.supplier",
  "refund.issue",
  "supplier.order.submit",
]);

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
    },
    (key) => {
      if (PRIVILEGE_ESCALATION_KEYS.test(key)) findings.push("privilege_escalation");
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
    code,
    riskLevel: extra.riskLevel || RISK_LEVEL.HIGH,
    requireApproval: true,
    ...extra,
  };
}

module.exports = {
  inspectUntrustedPayload,
  isolateAgent,
  clearIsolation,
  isIsolated,
  isMoneyAction,
  failClosedDenial,
  PROMPT_INJECTION,
};
