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
  function create({ title, fromId, kind = null, originRequesterId = null, delegationChain = [] } = {}) {
    if (!fromId) return { ok: false, code: "ACTOR_REQUIRED", assigned: false, permissionIncreased: false };
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
    const row = {
      id,
      title,
      kind,
      state: "CREATED",
      requestedBy: fromId,
      assignees: [],
      reports: [],
      humanApproval: false,
      identitiesMerged: false,
      liveNetwork: false,
    };
    tasks.set(id, row);
    return { ok: true, task: row, permission, permissionIncreased: false };
  }
  function assignNew({ fromId, assigneeId, title = "local assignment", originRequesterId = null, delegationChain = [] } = {}) {
    const gate = assignmentPermission(fromId, originRequesterId, delegationChain);
    if (!gate.ok) return { ...gate, live: false };
    const resolved = resolveIdentity(assigneeId);
    if (!resolved.ok || !resolved.nativeId || !ids().includes(resolved.nativeId)) {
      return {
        ok: false,
        code: resolved.code === "NOT_NATIVE_SEED" ? "NOT_NATIVE_SEED" : "UNKNOWN_AGENT",
        assigned: false,
        created: false,
        permissionIncreased: false,
        live: false,
      };
    }
    const id = `task_${crypto.randomBytes(3).toString("hex")}`;
    const sent = bus.send({
      actorId: fromId,
      sender: fromId,
      receiver: resolved.nativeId,
      type: "task_request",
      taskId: id,
      body: String(title || "local assignment"),
      permission_scope: "task",
    });
    if (!sent.ok) {
      return { ok: false, code: sent.code, assigned: false, created: false, permissionIncreased: false, live: false };
    }
    const row = {
      id,
      title: String(title || "local assignment"),
      kind: null,
      state: "ASSIGNED",
      requestedBy: fromId,
      assignees: [resolved.nativeId],
      reports: [],
      humanApproval: false,
      identitiesMerged: false,
      liveNetwork: false,
      sender: fromId,
      receiver: resolved.nativeId,
      permission_scope: "task",
    };
    if (resolved.kind === "LEGACY_ALIAS") {
      row.aliasRequests = [{ alias: resolved.requestedId, nativeId: resolved.nativeId, identitiesMerged: false }];
    }
    tasks.set(id, row);
    return {
      ok: true,
      live: false,
      assigned: true,
      created: true,
      permissionIncreased: false,
      permission: gate.permission,
      sender: fromId,
      receiver: resolved.nativeId,
      taskId: id,
      permission_scope: "task",
      identitiesMerged: false,
      task: row,
    };
  }
  function assignmentPermission(fromId, originRequesterId, delegationChain) {
    if (!fromId) return { ok: false, code: "ACTOR_REQUIRED", assigned: false, permissionIncreased: false };
    const permission = authorizeDelegated({
      actorId: fromId,
      originRequesterId,
      chain: delegationChain,
      perm: "ASSIGN_TASK",
    });
    if (!permission.ok) {
      return { ok: false, code: permission.code, permission, assigned: false, permissionIncreased: false, created: false };
    }
    return { ok: true, permission };
  }
  function noteHistory(task, state, agentId) {
    task.history = task.history || [];
    const last = task.history[task.history.length - 1];
    if (last && last.state === state && last.agentId === agentId) return last;
    const entry = { taskId: task.id, state, agentId, at: new Date().toISOString() };
    task.history.push(entry);
    return entry;
  }
  function resultKey(agentId, ok, summary, code) {
    return `${agentId}:${ok === true}:${summary || ""}:${code || ""}`;
  }
  function assign({ taskId, agentId, fromId, originRequesterId = null, delegationChain = [] }) {
    const gate = assignmentPermission(fromId, originRequesterId, delegationChain);
    if (!gate.ok) return gate;
    const t = tasks.get(taskId);
    if (!t) return { ok: false, code: "TASK_NOT_FOUND", assigned: false, permissionIncreased: false };
    const resolved = resolveIdentity(agentId);
    if (!resolved.ok || !resolved.nativeId) {
      return { ok: false, code: resolved.code === "NOT_NATIVE_SEED" ? "NOT_NATIVE_SEED" : "UNKNOWN_AGENT", assigned: false, permissionIncreased: false };
    }
    if (!ids().includes(resolved.nativeId)) return { ok: false, code: "UNKNOWN_AGENT", assigned: false, permissionIncreased: false };
    const permission = gate.permission;
    const sent = bus.send({
      actorId: fromId,
      sender: fromId,
      receiver: resolved.nativeId,
      type: "task_request",
      taskId,
      body: t.title,
      permission_scope: "task",
    });
    if (!sent.ok) return { ok: false, code: sent.code, assigned: false, identitiesMerged: false, liveNetwork: false };
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
    t.requestedBy = fromId;
    t.identitiesMerged = false;
    t.liveNetwork = false;
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
    if (!t) return { ok: false, code: "TASK_NOT_FOUND", completed: false };
    if (t.state === "COMPLETED" || t.state === "FAILED") {
      return { ok: false, code: "TERMINAL_STATE", completed: t.state === "COMPLETED", task: t };
    }
    const already = t.assignees.length > 0 && t.assignees.every((agentId) => t.reports.some((report) => report.agentId === agentId));
    if (already) return { ok: false, code: "DUPLICATE_RESULT", duplicate: true, completed: false, task: t };
    noteHistory(t, "IN_PROGRESS", t.requestedBy || "pusat");
    t.state = "IN_PROGRESS";
    t.completed = false;
    let anyFailed = false;
    for (const agentId of t.assignees) {
      const r = think({ agentId, facts: { ask_expertise: true } });
      const summary = r.ok ? (Array.isArray(r.expertise) ? r.expertise[0] : r.expertise) : r.code;
      const key = resultKey(agentId, r.ok === true, summary, r.ok ? r.kind : r.code);
      t.reportKeys = t.reportKeys || [];
      if (t.reportKeys.includes(key)) continue;
      t.reportKeys.push(key);
      if (!r.ok) {
        anyFailed = true;
        t.reports.push({
          agentId,
          ok: false,
          code: r.code || "TASK_FAILED",
          expertise: null,
          kind: null,
          llmCompleted: false,
          identitiesMerged: false,
        });
        noteHistory(t, "FAILED", agentId);
        continue;
      }
      t.reports.push({ agentId, ok: true, expertise: r.expertise, kind: r.kind, llmCompleted: false, identitiesMerged: false });
      noteHistory(t, "WAITING", agentId);
      bus.send({
        actorId: agentId,
        sender: agentId,
        receiver: "pusat",
        type: "task_response",
        taskId,
        body: r.expertise,
        permission_scope: "task",
      });
    }
    if (anyFailed) {
      t.state = "FAILED";
      t.completed = false;
      return { ok: false, code: "TASK_FAILED", task: t, completed: false };
    }
    t.humanApproval = true;
    t.state = "APPROVAL_REQUIRED";
    t.completed = false;
    noteHistory(t, "APPROVAL_REQUIRED", t.requestedBy || "pusat");
    return { ok: true, task: t, completed: false, note: "not_marked_completed_without_human" };
  }
  function recordReport({ taskId, actorId, agentId, summary = "", ok: resultOk = true, code = null } = {}) {
    const t = tasks.get(taskId);
    if (!t) return { ok: false, code: "TASK_NOT_FOUND", recorded: false, completed: false };
    if (!actorId || actorId !== agentId) {
      return { ok: false, code: "REPORT_IDENTITY_MISMATCH", recorded: false, completed: false };
    }
    if (!t.assignees.includes(agentId)) {
      return { ok: false, code: "NOT_ASSIGNEE", recorded: false, completed: false };
    }
    const key = resultKey(agentId, resultOk === true, summary, code);
    t.reportKeys = t.reportKeys || [];
    if (t.reportKeys.includes(key)) {
      return { ok: false, code: "DUPLICATE_REPORT", recorded: false, completed: false, task: t };
    }
    t.reportKeys.push(key);
    t.reports.push({
      agentId,
      ok: resultOk === true,
      summary,
      code: resultOk === true ? null : code || "TASK_FAILED",
      identitiesMerged: false,
    });
    if (resultOk !== true) {
      t.state = "FAILED";
      t.completed = false;
      noteHistory(t, "FAILED", agentId);
      return { ok: false, code: code || "TASK_FAILED", recorded: true, completed: false, task: t };
    }
    if (t.state !== "FAILED") {
      t.state = "APPROVAL_REQUIRED";
      t.humanApproval = true;
      noteHistory(t, "WAITING", agentId);
    }
    t.completed = false;
    return { ok: true, recorded: true, completed: false, task: t };
  }
  function history() {
    return [...tasks.values()].map((task) => ({
      taskId: task.id,
      requestedBy: task.requestedBy,
      state: task.state,
      completed: task.state === "COMPLETED",
      assignees: [...task.assignees],
      events: (task.history || []).map((event) => ({ ...event })),
      reports: task.reports.map((report) => ({
        agentId: report.agentId,
        ok: report.ok !== false,
        code: report.code || null,
      })),
    }));
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
    assignNew,
    runAssigned,
    recordReport,
    history,
    forceComplete,
    bus,
    get: (id) => tasks.get(id),
    STATES,
    list: () => [...tasks.values()],
    snapshot,
  };
}

module.exports = { createRouter, STATES };
