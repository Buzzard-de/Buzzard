const crypto = require("crypto");
const { ids } = require("./identityRegistry");
const { check } = require("./permissionEngine");
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
  function create({ title, fromId = "pusat", kind = null } = {}) {
    if (!check(fromId, "ASSIGN_TASK").ok && fromId !== "pusat") {
      return { ok: false, code: "PERMISSION_DENIED" };
    }
    const id = `task_${crypto.randomBytes(3).toString("hex")}`;
    const row = { id, title, kind, state: "CREATED", assignees: [], reports: [], humanApproval: false };
    tasks.set(id, row);
    return { ok: true, task: row };
  }
  function assign({ taskId, agentId, fromId = "pusat" }) {
    const t = tasks.get(taskId);
    if (!t) return { ok: false, code: "TASK_NOT_FOUND" };
    if (!ids().includes(agentId)) return { ok: false, code: "UNKNOWN_AGENT" };
    if (!check(fromId, "ASSIGN_TASK").ok) return { ok: false, code: "PERMISSION_DENIED" };
    t.assignees.push(agentId);
    t.state = "ASSIGNED";
    bus.send({ sender: fromId, receiver: agentId, type: "task_request", taskId, body: t.title });
    return { ok: true, task: t };
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
