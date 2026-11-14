/**
 * Human Approval Center — persists through the durable queue when a dbPath is given.
 * Automatic approval exists only for an explicit allowlist. Caller-supplied risk
 * does not reclassify an action.
 */
const { createDurableTaskQueue } = require("./durableTaskQueue");
const { authorizeDelegated } = require("../buzzardNative/core/permissionEngine");
const { classifyAction } = require("./actionPolicy");
const os = require("os");
const path = require("path");

const RISK = Object.freeze({
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
});

function containsCardNumber(value) {
  const stack = [value];
  while (stack.length) {
    const current = stack.pop();
    if (typeof current === "string" && /^\d{13,19}$/.test(current.replace(/[\s-]/g, ""))) return true;
    if (current && typeof current === "object") stack.push(...Object.values(current));
  }
  return false;
}

function normalizeCallerRisk(risk) {
  const name = String(risk || "").trim().toUpperCase();
  if (name === RISK.LOW || name === RISK.MEDIUM || name === RISK.HIGH || name === RISK.CRITICAL) return name;
  return RISK.HIGH;
}

function createApprovalCenter({ dbPath } = {}) {
  const resolved = dbPath || path.join(os.tmpdir(), "buzzard-approvals.sqlite");
  const queue = createDurableTaskQueue({ dbPath: resolved });

  function submit({
    action,
    requestedBy,
    reason,
    risk = RISK.HIGH,
    payload = {},
    taskId = "standalone",
    originRequesterId = null,
    delegationChain = [],
  } = {}) {
    if (containsCardNumber(payload) || containsCardNumber(reason)) {
      return { ok: false, code: "CARD_DATA_REJECTED", stored: false, auto: false };
    }
    const policy = classifyAction(action);
    const callerRisk = normalizeCallerRisk(risk);
    const permission = authorizeDelegated({
      actorId: requestedBy,
      originRequesterId,
      chain: delegationChain,
      perm: policy.action,
    });
    if (policy.classification === "AUTO_LOW" && callerRisk === RISK.LOW) {
      if (!permission.ok || permission.permissionIncreased) {
        return {
          ok: false,
          code: permission.code,
          permission,
          classification: policy.classification,
          risk: policy.risk,
          callerRisk,
          stored: false,
          auto: false,
          permissionIncreased: false,
        };
      }
      return {
        ok: true,
        permission,
        classification: policy.classification,
        risk: policy.risk,
        callerRisk,
        auto: true,
        permissionIncreased: false,
        item: {
          status: "APPROVED",
          risk: policy.risk,
          decidedBy: "policy:explicit-allow",
          auto: true,
        },
      };
    }
    const storedRisk = policy.classification === "AUTO_LOW" ? callerRisk : policy.risk;
    const queued = queue.submitApproval({
      taskId: payload.taskId || taskId,
      action: policy.action,
      requestedBy,
      reason,
      risk: storedRisk,
      payload: {
        ...payload,
        policy: {
          classification: policy.classification,
          risk: policy.risk,
          callerRisk,
          registered: policy.registered,
        },
      },
    });
    return {
      ...queued,
      permission,
      auto: false,
      classification: policy.classification,
      risk: storedRisk,
      callerRisk,
      permissionIncreased: false,
      ...(policy.registered ? {} : { code: "UNREGISTERED_ACTION" }),
    };
  }

  function decide({ id, approved, actorId }) {
    return queue.decideApproval({ id, approved, actorId });
  }

  function pending() {
    return queue.listApprovals({ status: "WAITING_APPROVAL" });
  }

  return {
    submit,
    decide,
    pending,
    list: () => queue.listApprovals(),
    close: () => queue.close(),
    RISK,
  };
}

module.exports = { createApprovalCenter, RISK, classifyAction };
