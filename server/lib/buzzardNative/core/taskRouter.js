const crypto = require("crypto");
const { ids } = require("./identityRegistry");
const { resolveIdentity } = require("./councilAliasMap");
const { authorizeDelegated } = require("./permissionEngine");
const { think } = require("./sharedThinking");
const { createAgentBus } = require("./agentBus");

const STATES = Object.freeze([
  "CREATED",
  "ASSIGNED",
  "IN_PROGRESS",
  "WAITING",
  "BLOCKED",
  "REVIEW_REQUIRED",
  "APPROVAL_REQUIRED",
  "COMPLETED",
  "FAILED",
]);

function createRouter({ seed = [] } = {}) {
  const tasks = new Map();
  for (const row of seed) tasks.set(row.id, { ...row });
  const bus = createAgentBus();
  function create({ title, fromId = "pusat", kind = null, originRequesterId = null, delegationChain = [] } = {}) {
    const permission = authorizeDelegated({
      actorId: fromId,
      originRequesterId,
      chain: delegationChain,
      perm: "ASSIGN_TASK",
    });
    if (!permission.ok) {
      return { ok: false, code: permission.code, permission, assigned: false, permissionIncreased: false };
    }
    const id = `task_${crypto.randomBytes(3).toString("hex")}`;
    const row = { id, title, kind, state: "CREATED", assignees: [], reports: [], humanApproval: false };
    tasks.set(id, row);
    return { ok: true, task: row, permission, permissionIncreased: false };
  }
  function assign({ taskId, agentId, fromId = "pusat", originRequesterId = null, delegationChain = [] }) {
    const t = tasks.get(taskId);
    if (!t) return { ok: false, code: "TASK_NOT_FOUND" };
    const resolved = resolveIdentity(agentId);
    if (!resolved.ok || !resolved.nativeId) {
      return { ok: false, code: resolved.code === "NOT_NATIVE_SEED" ? "NOT_NATIVE_SEED" : "UNKNOWN_AGENT" };
    }
    if (!ids().includes(resolved.nativeId)) return { ok: false, code: "UNKNOWN_AGENT" };
    const permission = authorizeDelegated({
      actorId: fromId,
      originRequesterId,
      chain: delegationChain,
      perm: "ASSIGN_TASK",
    });
    if (!permission.ok) {
      return { ok: false, code: permission.code, permission, assigned: false, permissionIncreased: false };
    }
    t.assignees.push(resolved.nativeId);
    t.aliasRequests = t.aliasRequests || [];
    if (resolved.kind === "LEGACY_ALIAS") {
      t.aliasRequests.push({
        alias: resolved.requestedId,
        nativeId: resolved.nativeId,
        identitiesMerged: false,
      });
    }
    t.state = "ASSIGNED";
    bus.send({ sender: fromId, receiver: resolved.nativeId, type: "task_request", taskId, body: t.title });
    return {
      ok: true,
      task: t,
      resolved,
      requestedId: resolved.requestedId,
      nativeId: resolved.nativeId,
      identitiesMerged: false,
      permission,
      permissionIncreased: false,
    };
  }
  function runAssigned(taskId) {
    const t = tasks.get(taskId);
    if (!t) return { ok: false, code: "TASK_NOT_FOUND" };
    t.state = "IN_PROGRESS";
    for (const agentId of t.assignees) {
      const r = think({ agentId, facts: { ask_expertise: true } });
      t.reports.push({ agentId, expertise: r.expertise, kind: r.kind, llmCompleted: false });
      bus.send({ sender: agentId, receiver: "pusat", type: "task_response", taskId, body: r.expertise });
    }
    t.state = "REVIEW_REQUIRED";
    t.humanApproval = true;
    t.state = "APPROVAL_REQUIRED";
    return { ok: true, task: t, completed: false, note: "not_marked_completed_without_human" };
  }
  function forceComplete() {
    return { ok: false, code: "HUMAN_GATE_REQUIRED", state: "APPROVAL_REQUIRED" };
  }
  function snapshot() {
    return [...tasks.values()].map((t) => JSON.parse(JSON.stringify(t)));
  }
  return {
    create,
    assign,
    runAssigned,
    forceComplete,
    bus,
    get: (id) => tasks.get(id),
    STATES,
    list: () => [...tasks.values()],
    snapshot,
  };
}

module.exports = { createRouter, STATES };
