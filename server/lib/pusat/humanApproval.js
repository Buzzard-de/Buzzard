/**
 * Human Approval Center — persists through the durable queue when a dbPath is given.
 * Automatic approval exists only for an explicit allowlist. Caller-supplied risk
 * does not reclassify an action.
 */
const { createDurableTaskQueue } = require("./durableTaskQueue");
const { authorizeDelegated } = require("../buzzardNative/core/permissionEngine");
const { classifyAction } = require("./actionPolicy");
const fs = require("fs");
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

function approvalRefuse() {
  const err = new Error("APPROVAL_DB_PATH_REFUSED");
  err.code = "APPROVAL_DB_PATH_REFUSED";
  throw err;
}

function existingRealPath(file) {
  try {
    return fs.realpathSync(file);
  } catch (err) {
    if (err && err.code === "ENOENT") return null;
    approvalRefuse();
  }
  return null;
}

function existingStat(file) {
  try {
    return fs.statSync(file);
  } catch (err) {
    if (err && err.code === "ENOENT") return null;
    approvalRefuse();
  }
  return null;
}

function linkStatus(file) {
  try {
    return fs.lstatSync(file);
  } catch (err) {
    if (err && err.code === "ENOENT") return null;
    approvalRefuse();
  }
  return null;
}

function describeApprovalPath(file) {
  const resolved = path.resolve(file);
  const link = linkStatus(resolved);
  if (link && link.isSymbolicLink()) {
    const direct = existingRealPath(resolved);
    if (!direct) approvalRefuse();
    const stat = existingStat(direct);
    if (!stat || stat.isDirectory()) approvalRefuse();
    return { real: direct, stat };
  }
  if (link) {
    if (link.isDirectory()) approvalRefuse();
    return { real: existingRealPath(resolved) || resolved, stat: link };
  }
  const parentReal = existingRealPath(path.dirname(resolved));
  if (!parentReal) approvalRefuse();
  const real = path.join(parentReal, path.basename(resolved));
  const stat = existingStat(real);
  if (stat && stat.isDirectory()) approvalRefuse();
  return { real, stat };
}

function sameFileIdentity(left, right) {
  if (!left || !right) return false;
  if (left.real && right.real && left.real === right.real) return true;
  if (
    left.stat
    && right.stat
    && left.stat.ino === right.stat.ino
    && left.stat.dev === right.stat.dev
  ) {
    return true;
  }
  return false;
}

function commerceCandidates(commercePath) {
  const candidates = [path.join(__dirname, "..", "..", "data", "buzzard.db")];
  if (typeof process.env.BUZZARD_DB_PATH === "string" && process.env.BUZZARD_DB_PATH.trim()) {
    candidates.push(process.env.BUZZARD_DB_PATH.trim());
  }
  if (typeof commercePath === "string" && commercePath.trim()) candidates.push(commercePath.trim());
  return candidates;
}

function assertApprovalDbPath(dbPath, commercePath) {
  if (typeof dbPath !== "string" || !dbPath.trim() || dbPath.includes("\0")) approvalRefuse();
  const resolved = path.resolve(dbPath.trim());
  if (!resolved || !path.isAbsolute(resolved)) approvalRefuse();
  const base = path.basename(resolved);
  if (!base || base === "." || base === ".." || base.startsWith("buzzard_guardian")) approvalRefuse();
  const described = describeApprovalPath(resolved);
  const dataDir = existingRealPath(path.resolve(path.join(__dirname, "..", "..", "data")))
    || path.resolve(path.join(__dirname, "..", "..", "data"));
  if (described.real === dataDir || described.real.startsWith(`${dataDir}${path.sep}`)) approvalRefuse();
  const realBase = path.basename(described.real);
  if (realBase === "buzzard.db" || realBase.startsWith("buzzard_guardian")) approvalRefuse();
  for (const candidate of commerceCandidates(commercePath)) {
    let commerce = null;
    try {
      commerce = describeApprovalPath(candidate);
    } catch {
      commerce = null;
    }
    if (sameFileIdentity(described, commerce)) approvalRefuse();
  }
  return described.real;
}

function createApprovalCenter({ dbPath, commercePath } = {}) {
  const selected = dbPath || path.join(os.tmpdir(), "buzzard-approvals.sqlite");
  const resolved = assertApprovalDbPath(selected, commercePath);
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
