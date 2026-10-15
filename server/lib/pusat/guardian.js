/**
 * Local Guardian / Esat Bey policy — gates actual Pusat execution paths.
 * Optional remote Python Guardian remains a health signal only.
 */

const controlCenter = require("../controlCenter");
const { aiCanExecute } = require("../rbac");
const { getGuardianStatus } = require("../guardianBridge");
const { SENSITIVE_ACTIONS, EXCEPTION_CODES, RISK_LEVEL } = require("./constants");
const { logSecurityEvent } = require("../securityLog");
const esatSecurity = require("./esatSecurity");

const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 60;
const hits = new Map();

const DANGEROUS_PATTERN =
  /\b(purchase|refund|payout|wire_transfer|delete_all|drop\s+table|rm\s+-rf|exfiltrat|bypass[_-]?approval)\b/i;

function recordHit(agentId) {
  const now = Date.now();
  const list = (hits.get(agentId) || []).filter((t) => now - t < RATE_WINDOW_MS);
  list.push(now);
  hits.set(agentId, list);
  return list.length;
}

function resetRateLimiter() {
  hits.clear();
}

function scanSecrets(payload) {
  if (!payload || typeof payload !== "object") return [];
  const found = [];
  const seen = new WeakSet();
  const walk = (obj, path) => {
    if (!obj || typeof obj !== "object") return;
    if (seen.has(obj)) return;
    seen.add(obj);
    for (const [key, value] of Object.entries(obj)) {
      const lower = String(key).toLowerCase();
      if (/(password|secret|api_key|apikey|token|private_key|authorization)/.test(lower)) {
        found.push(path ? `${path}.${key}` : key);
      }
      if (value && typeof value === "object") walk(value, path ? `${path}.${key}` : key);
    }
  };
  walk(payload, "");
  return found;
}

function actionRequiresApproval(action, priority) {
  if (priority === "CRITICAL") return true;
  return SENSITIVE_ACTIONS.includes(action);
}

function evaluate(input = {}) {
  try {
    return evaluateUnsafe(input);
  } catch {
    return {
      ok: false,
      allowed: false,
      failClosed: true,
      code: EXCEPTION_CODES.GUARDIAN_BLOCKED,
      message: "Guardian evaluation failed closed",
      requireApproval: true,
      decisions: [{ check: "exception", pass: false }],
    };
  }
}

function evaluateUnsafe({
  agentId,
  employee,
  action,
  tool,
  payload,
  permissionsRequired = [],
  priority,
} = {}) {
  const decisions = [];
  const deny = (code, message, extra = {}) => {
    const result = {
      ok: false,
      allowed: false,
      code,
      message,
      riskLevel: extra.riskLevel || RISK_LEVEL.HIGH,
      requireApproval: Boolean(extra.requireApproval),
      decisions,
      ...extra,
    };
    controlCenter.recordSystemEvent({
      eventType: "guardian.deny",
      actorType: "guardian",
      actorId: "esat_bey",
      resourceType: "ai_agent",
      resourceId: agentId || null,
      summary: message,
      metadata: { code, action, tool },
    });
    logSecurityEvent({
      type: "guardian_deny",
      success: false,
      detail: { code, agentId, action, tool },
    });
    return result;
  };

  if (!agentId && !employee) {
    return deny(EXCEPTION_CODES.GUARDIAN_BLOCKED, "Agent identity required");
  }
  if (!employee || !employee.id) {
    return deny(EXCEPTION_CODES.GUARDIAN_BLOCKED, "Agent employee identity required");
  }
  if (esatSecurity.isIsolated(employee.id) || esatSecurity.isIsolated(agentId)) {
    return deny(EXCEPTION_CODES.GUARDIAN_BLOCKED, "Agent is isolated", {
      isolated: true,
      grantedPermissions: [],
    });
  }

  if (employee && employee.status && employee.status !== "ACTIVE") {
    return deny(EXCEPTION_CODES.AGENT_UNAVAILABLE, `Agent ${employee.id} is ${employee.status}`);
  }

  const permissions = employee?.permissions || [];
  for (const perm of permissionsRequired) {
    if (!aiCanExecute(permissions, perm)) {
      decisions.push({ check: "permission", perm, pass: false });
      return deny(EXCEPTION_CODES.PERMISSION_DENIED, `Permission denied: ${perm}`, { permission: perm });
    }
    decisions.push({ check: "permission", perm, pass: true });
  }

  if (tool && employee?.tools instanceof Set && !employee.tools.has(tool) && !employee.tools.has("*")) {
    decisions.push({ check: "tool", tool, pass: false });
    return deny(EXCEPTION_CODES.GUARDIAN_BLOCKED, `Tool not authorized: ${tool}`, { tool });
  }
  if (tool && Array.isArray(employee?.tools) && employee.tools.length && !employee.tools.includes(tool) && !employee.tools.includes("*")) {
    decisions.push({ check: "tool", tool, pass: false });
    return deny(EXCEPTION_CODES.GUARDIAN_BLOCKED, `Tool not authorized: ${tool}`, { tool });
  }
  decisions.push({ check: "tool", tool: tool || null, pass: true });

  const secrets = scanSecrets(payload);
  if (secrets.length) {
    return deny(EXCEPTION_CODES.GUARDIAN_BLOCKED, "Secret-bearing payload rejected", {
      fields: secrets,
      riskLevel: RISK_LEVEL.CRITICAL,
    });
  }

  const untrusted = esatSecurity.inspectUntrustedPayload(payload);
  if (untrusted.includes("prompt_injection")) {
    return deny(EXCEPTION_CODES.GUARDIAN_BLOCKED, "Untrusted content cannot override policy", {
      riskLevel: RISK_LEVEL.CRITICAL,
      requireApproval: true,
    });
  }
  if (untrusted.includes("privilege_escalation")) {
    return deny(EXCEPTION_CODES.PERMISSION_DENIED, "Agent cannot raise its own privileges", {
      riskLevel: RISK_LEVEL.CRITICAL,
    });
  }

  let serialized = `${action || ""} ${tool || ""}`;
  try {
    serialized += ` ${JSON.stringify(payload || {})}`;
  } catch {
    return deny(EXCEPTION_CODES.GUARDIAN_BLOCKED, "Guardian evaluation failed closed", { failClosed: true });
  }
  if (DANGEROUS_PATTERN.test(serialized)) {
    decisions.push({ check: "dangerous", pass: false });
    return deny(EXCEPTION_CODES.GUARDIAN_BLOCKED, "Dangerous or unexpected action detected", {
      riskLevel: RISK_LEVEL.CRITICAL,
      requireApproval: true,
    });
  }
  decisions.push({ check: "dangerous", pass: true });

  const count = recordHit(agentId || employee?.id || "unknown");
  if (count > RATE_LIMIT) {
    return deny(EXCEPTION_CODES.GUARDIAN_BLOCKED, "Agent rate limit exceeded", { rate: count });
  }
  decisions.push({ check: "rate", count, pass: true });

  const needsApproval = actionRequiresApproval(action, priority);
  if (needsApproval) {
    decisions.push({ check: "approval", required: true });
  }

  try {
    controlCenter.recordSystemEvent({
      eventType: "guardian.allow",
      actorType: "guardian",
      actorId: "esat_bey",
      resourceType: "ai_agent",
      resourceId: agentId || employee?.id || null,
      summary: `Guardian allowed ${action || "task"}`,
      metadata: { tool, requireApproval: needsApproval },
    });
  } catch {
    return deny(EXCEPTION_CODES.GUARDIAN_BLOCKED, "Guardian evaluation failed closed", { failClosed: true });
  }

  return {
    ok: true,
    allowed: true,
    requireApproval: needsApproval,
    decisions,
    riskLevel: needsApproval ? RISK_LEVEL.HIGH : RISK_LEVEL.LOW,
  };
}

async function remoteStatus() {
  return getGuardianStatus();
}

module.exports = {
  evaluate,
  actionRequiresApproval,
  scanSecrets,
  resetRateLimiter,
  remoteStatus,
  isolateAgent: esatSecurity.isolateAgent,
  clearIsolation: esatSecurity.clearIsolation,
};
