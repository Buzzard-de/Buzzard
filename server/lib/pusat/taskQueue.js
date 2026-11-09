/**
 * In-memory Pusat orchestrator. Not a 24/7 hosted factory.
 * Complete is blocked until acceptance+tests pass and approvals clear.
 */
const crypto = require("crypto");
const { check } = require("../buzzardNative/core/permissionEngine");
const { resolveIdentity } = require("../buzzardNative/core/councilAliasMap");

const PRIORITY = Object.freeze(["P0", "P1", "P2", "P3"]);

function createTaskQueue({ now = () => Date.now(), maxConcurrent = 4 } = {}) {
  const tasks = new Map();
  const idempotency = new Map();
  const deadLetters = [];
  const audit = [];
  const workers = { healthy: true, inFlight: 0, maxConcurrent, live: false };

  function auditPush(event) {
    audit.push({ ...event, at: new Date(now()).toISOString() });
  }

  function enqueue({
    title,
    ownerId = "pusat",
    assigneeId = "sinan_bey",
    priority = "P2",
    dependsOn = [],
    idempotencyKey = null,
    timeoutMs = 30_000,
    maxAttempts = 3,
    needsApproval = false,
    acceptance = [],
  } = {}) {
    if (!check(ownerId, "ASSIGN_TASK").ok && ownerId !== "pusat") {
      return { ok: false, code: "PERMISSION_DENIED" };
    }
    if (idempotencyKey && idempotency.has(idempotencyKey)) {
      return { ok: true, duplicate: true, task: tasks.get(idempotency.get(idempotencyKey)) };
    }
    const resolved = resolveIdentity(assigneeId);
    const nativeId = resolved.ok ? resolved.nativeId : assigneeId;
    const id = `orch_${crypto.randomBytes(4).toString("hex")}`;
    const row = {
      id,
      title: String(title || "untitled"),
      ownerId,
      assigneeId: nativeId,
      requestedAssignee: assigneeId,
      identitiesMerged: false,
      priority: PRIORITY.includes(priority) ? priority : "P2",
      dependsOn: [...dependsOn],
      state: needsApproval ? "BLOCKED_APPROVAL" : "QUEUED",
      attempts: 0,
      maxAttempts,
      timeoutMs,
      acceptance: [...acceptance],
      testsPassed: false,
      acceptancePassed: false,
      completed: false,
      live: false,
    };
    tasks.set(id, row);
    if (idempotencyKey) idempotency.set(idempotencyKey, id);
    auditPush({ event: "ENQUEUE", id, ownerId });
    return { ok: true, task: { ...row } };
  }

  function depsMet(row) {
    return row.dependsOn.every((depId) => tasks.get(depId)?.completed === true);
  }

  function tick() {
    if (!workers.healthy) return { ok: false, code: "WORKER_UNHEALTHY" };
    const ready = [...tasks.values()]
      .filter((t) => t.state === "QUEUED" && depsMet(t))
      .sort((a, b) => PRIORITY.indexOf(a.priority) - PRIORITY.indexOf(b.priority));
    const started = [];
    for (const row of ready) {
      if (workers.inFlight >= workers.maxConcurrent) break;
      workers.inFlight += 1;
      row.state = "RUNNING";
      row.attempts += 1;
      started.push(row.id);
      auditPush({ event: "START", id: row.id });
    }
    return { ok: true, started };
  }

  function fail(id, { retry = true } = {}) {
    const row = tasks.get(id);
    if (!row) return { ok: false, code: "NOT_FOUND" };
    workers.inFlight = Math.max(0, workers.inFlight - 1);
    if (retry && row.attempts < row.maxAttempts) {
      row.state = "QUEUED";
      auditPush({ event: "RETRY", id });
      return { ok: true, task: { ...row } };
    }
    row.state = "DEAD_LETTER";
    deadLetters.push({ id, reason: "FAILED" });
    auditPush({ event: "DEAD_LETTER", id });
    return { ok: true, task: { ...row } };
  }

  function timeout(id) {
    return fail(id, { retry: true });
  }

  function recover(id) {
    const row = tasks.get(id);
    if (!row) return { ok: false, code: "NOT_FOUND" };
    if (row.state !== "DEAD_LETTER") return { ok: false, code: "NOT_DEAD_LETTER" };
    row.state = "QUEUED";
    auditPush({ event: "RECOVER", id });
    return { ok: true, task: { ...row } };
  }

  function markTests({ id, testsPassed, acceptancePassed }) {
    const row = tasks.get(id);
    if (!row) return { ok: false, code: "NOT_FOUND" };
    row.testsPassed = Boolean(testsPassed);
    row.acceptancePassed = Boolean(acceptancePassed);
    return { ok: true, task: { ...row } };
  }

  function complete(id) {
    const row = tasks.get(id);
    if (!row) return { ok: false, code: "NOT_FOUND" };
    if (row.state === "BLOCKED_APPROVAL") return { ok: false, code: "BLOCKED_APPROVAL" };
    if (!row.testsPassed || !row.acceptancePassed) {
      return { ok: false, code: "ACCEPTANCE_OR_TESTS_REQUIRED", completed: false };
    }
    workers.inFlight = Math.max(0, workers.inFlight - 1);
    row.state = "COMPLETED";
    row.completed = true;
    auditPush({ event: "COMPLETE", id });
    return { ok: true, task: { ...row } };
  }

  return {
    enqueue,
    tick,
    fail,
    timeout,
    recover,
    markTests,
    complete,
    snapshot: () => ({
      tasks: [...tasks.values()].map((t) => ({ ...t })),
      deadLetters: [...deadLetters],
      workers: { ...workers },
      audit: [...audit],
      live: false,
    }),
    PRIORITY,
  };
}

module.exports = { createTaskQueue, PRIORITY };
