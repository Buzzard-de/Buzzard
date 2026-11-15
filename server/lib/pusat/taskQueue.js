/**
 * In-memory Pusat orchestrator. Not a 24/7 hosted factory.
 * Complete is blocked until acceptance+tests pass and approvals clear.
 */
const crypto = require("crypto");
const { authorizeDelegated } = require("../buzzardNative/core/permissionEngine");
const { resolveIdentity } = require("../buzzardNative/core/councilAliasMap");

const PRIORITY = Object.freeze(["P0", "P1", "P2", "P3"]);

function createTaskQueue({ now = () => Date.now(), maxConcurrent = 4 } = {}) {
  const tasks = new Map();
  const idempotency = new Map();
  const deadLetters = [];
  const audit = [];
  const roster = new Map();
  const HEARTBEAT_TTL_MS = 15_000;
  const workers = { inFlight: 0, maxConcurrent, live: false };

  function workerSnapshot(at = now()) {
    const rows = [...roster.values()].map((row) => {
      const expired = at - row.lastHeartbeat > HEARTBEAT_TTL_MS || row.status === "CRASHED";
      return { ...row, expired };
    });
    const online = rows.filter((row) => row.status === "ONLINE" && !row.expired);
    const stale = rows.filter((row) => row.expired || row.status === "STALE" || row.status === "CRASHED");
    return {
      healthy: online.length > 0 && stale.length === 0,
      live: false,
      inFlight: workers.inFlight,
      maxConcurrent: workers.maxConcurrent,
      registered: rows.length,
      online: online.length,
      stale: stale.length,
      identities: rows.map((row) => row.identity),
      heartbeats: rows.reduce((sum, row) => sum + row.heartbeatCount, 0),
    };
  }

  function registerWorker({ workerId = "local-session", identity = workerId } = {}) {
    const at = now();
    roster.set(workerId, {
      workerId,
      identity,
      registeredAt: at,
      lastHeartbeat: at,
      status: "ONLINE",
      heartbeatCount: 1,
      ownedTask: null,
    });
    return { ok: true, workers: workerSnapshot(at) };
  }

  function heartbeat({ workerId = "local-session", at = now() } = {}) {
    const row = roster.get(workerId);
    if (!row) return { ok: false, code: "WORKER_UNKNOWN" };
    row.lastHeartbeat = at;
    row.status = "ONLINE";
    row.heartbeatCount += 1;
    return { ok: true, workers: workerSnapshot(at) };
  }

  registerWorker({ workerId: "local-session", identity: "in-process" });

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
    originRequesterId = null,
    delegationChain = [],
  } = {}) {
    const permission = authorizeDelegated({
      actorId: ownerId,
      originRequesterId,
      chain: delegationChain,
      perm: "ASSIGN_TASK",
    });
    if (!permission.ok) {
      return { ok: false, code: permission.code, permission, assigned: false, permissionIncreased: false };
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
    auditPush({ event: "ENQUEUE", id, ownerId, permission: permission.code });
    return { ok: true, task: { ...row }, permission, permissionIncreased: false };
  }

  function depsMet(row) {
    return row.dependsOn.every((depId) => tasks.get(depId)?.completed === true);
  }

  function tick() {
    heartbeat({ workerId: "local-session" });
    if (!workerSnapshot().healthy) return { ok: false, code: "WORKER_UNHEALTHY" };
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

  function fail(id, { retry = true, reason = "FAILED" } = {}) {
    const row = tasks.get(id);
    if (!row) return { ok: false, code: "NOT_FOUND", completed: false, failed: false };
    if (row.state === "BLOCKED_APPROVAL") return { ok: false, code: "BLOCKED_APPROVAL", completed: false, failed: false, task: { ...row } };
    if (row.state !== "RUNNING" && row.state !== "QUEUED") {
      return { ok: false, code: "TERMINAL_STATE", completed: false, failed: false, task: { ...row } };
    }
    if (row.state === "RUNNING") workers.inFlight = Math.max(0, workers.inFlight - 1);
    const entry = { at: new Date(now()).toISOString(), reason: String(reason || "FAILED"), attempt: row.attempts, priorState: row.state };
    row.failureHistory = [...(row.failureHistory || []), entry];
    row.lastError = entry.reason;
    row.completed = false;
    if (retry && row.attempts < row.maxAttempts) {
      row.state = "QUEUED";
      auditPush({ event: "RETRY", id, reason: entry.reason });
      return { ok: true, failed: true, completed: false, retried: true, task: { ...row } };
    }
    row.state = "DEAD_LETTER";
    deadLetters.push({ id, reason: entry.reason, at: entry.at });
    auditPush({ event: "DEAD_LETTER", id, reason: entry.reason });
    return { ok: true, failed: true, completed: false, deadLetter: true, task: { ...row } };
  }

  function timeout(id) {
    return fail(id, { retry: true });
  }

  function recover(id) {
    const row = tasks.get(id);
    if (!row) return { ok: false, code: "NOT_FOUND" };
    if (row.state !== "DEAD_LETTER") return { ok: false, code: "NOT_DEAD_LETTER" };
    row.state = "QUEUED";
    row.completed = false;
    auditPush({ event: "RECOVER", id });
    return { ok: true, executed: false, task: { ...row } };
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
    if (row.state === "BLOCKED_APPROVAL") return { ok: false, code: "BLOCKED_APPROVAL", completed: false };
    if (row.state === "DEAD_LETTER" || row.state === "REJECTED" || row.state === "COMPLETED") {
      return { ok: false, code: "TERMINAL_STATE", completed: false, task: { ...row } };
    }
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
    registerWorker,
    heartbeat,
    workerSnapshot,
    fail,
    timeout,
    recover,
    markTests,
    complete,
    snapshot: () => ({
      tasks: [...tasks.values()].map((t) => ({ ...t })),
      deadLetters: [...deadLetters],
      workers: workerSnapshot(),
      audit: [...audit],
      live: false,
    }),
    PRIORITY,
  };
}

module.exports = { createTaskQueue, PRIORITY };
