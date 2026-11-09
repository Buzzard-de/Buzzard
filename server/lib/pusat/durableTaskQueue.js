/**
 * Durable Pusat task queue on an isolated SQLite file.
 * Never uses Guardian SQLite. Recovery is proven by reopen, not by claiming hosted workers.
 */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { createRequire } = require("module");
const { resolveIdentity } = require("../buzzardNative/core/councilAliasMap");
const { check } = require("../buzzardNative/core/permissionEngine");

function loadSqlite() {
  const root = path.join(__dirname, "..", "..", "..");
  try {
    return createRequire(path.join(root, "server", "package.json"))("better-sqlite3");
  } catch {
    return require("better-sqlite3");
  }
}

function assertNotGuardian(dbPath) {
  const base = path.basename(String(dbPath || ""));
  if (base.startsWith("buzzard_guardian")) {
    throw new Error("GUARDIAN_SQLITE_FORBIDDEN");
  }
}

function openDb(dbPath) {
  assertNotGuardian(dbPath);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const Database = loadSqlite();
  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS orch_tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      assignee_id TEXT NOT NULL,
      requested_assignee TEXT,
      priority TEXT NOT NULL,
      depends_json TEXT NOT NULL,
      state TEXT NOT NULL,
      attempts INTEGER NOT NULL,
      max_attempts INTEGER NOT NULL,
      timeout_ms INTEGER NOT NULL,
      idempotency_key TEXT UNIQUE,
      needs_approval INTEGER NOT NULL,
      tests_passed INTEGER NOT NULL,
      acceptance_passed INTEGER NOT NULL,
      lease_owner TEXT,
      updated_at TEXT NOT NULL,
      payload_json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS orch_audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id TEXT NOT NULL,
      event TEXT NOT NULL,
      at TEXT NOT NULL,
      detail TEXT
    );
    CREATE TABLE IF NOT EXISTS orch_dead (
      task_id TEXT PRIMARY KEY,
      reason TEXT NOT NULL,
      at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS orch_approvals (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      action TEXT NOT NULL,
      requested_by TEXT NOT NULL,
      decided_by TEXT,
      status TEXT NOT NULL,
      risk TEXT NOT NULL,
      reason TEXT,
      expires_at TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      decided_at TEXT
    );
  `);
  return db;
}

function createDurableTaskQueue({ dbPath }) {
  if (!dbPath) throw new Error("DB_PATH_REQUIRED");
  const db = openDb(dbPath);

  function audit(taskId, event, detail) {
    db.prepare(`INSERT INTO orch_audit (task_id, event, at, detail) VALUES (?,?,?,?)`).run(
      taskId,
      event,
      new Date().toISOString(),
      detail ? JSON.stringify(detail) : null
    );
  }

  function rowToTask(row) {
    if (!row) return null;
    return {
      id: row.id,
      title: row.title,
      ownerId: row.owner_id,
      assigneeId: row.assignee_id,
      requestedAssignee: row.requested_assignee,
      priority: row.priority,
      dependsOn: JSON.parse(row.depends_json),
      state: row.state,
      attempts: row.attempts,
      maxAttempts: row.max_attempts,
      timeoutMs: row.timeout_ms,
      idempotencyKey: row.idempotency_key,
      needsApproval: Boolean(row.needs_approval),
      testsPassed: Boolean(row.tests_passed),
      acceptancePassed: Boolean(row.acceptance_passed),
      leaseOwner: row.lease_owner,
      identitiesMerged: false,
      live: false,
      payload: JSON.parse(row.payload_json || "{}"),
    };
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
    kind = "THINK",
    input = {},
  } = {}) {
    if (!check(ownerId, "ASSIGN_TASK").ok && ownerId !== "pusat") {
      return { ok: false, code: "PERMISSION_DENIED" };
    }
    if (idempotencyKey) {
      const existing = db.prepare(`SELECT * FROM orch_tasks WHERE idempotency_key = ?`).get(idempotencyKey);
      if (existing) return { ok: true, duplicate: true, task: rowToTask(existing) };
    }
    const resolved = resolveIdentity(assigneeId);
    const nativeId = resolved.ok ? resolved.nativeId : assigneeId;
    const id = `dorch_${crypto.randomBytes(4).toString("hex")}`;
    const state = needsApproval ? "BLOCKED_APPROVAL" : "QUEUED";
    db.prepare(
      `INSERT INTO orch_tasks (id,title,owner_id,assignee_id,requested_assignee,priority,depends_json,state,attempts,max_attempts,timeout_ms,idempotency_key,needs_approval,tests_passed,acceptance_passed,lease_owner,updated_at,payload_json)
       VALUES (?,?,?,?,?,?,?,?,0,?,?,?,?,0,0,NULL,?,?)`
    ).run(
      id,
      String(title || "untitled"),
      ownerId,
      nativeId,
      assigneeId,
      priority,
      JSON.stringify(dependsOn),
      state,
      maxAttempts,
      timeoutMs,
      idempotencyKey,
      needsApproval ? 1 : 0,
      new Date().toISOString(),
      JSON.stringify({ kind, input })
    );
    audit(id, "ENQUEUE", { ownerId });
    return { ok: true, task: get(id) };
  }

  function get(id) {
    return rowToTask(db.prepare(`SELECT * FROM orch_tasks WHERE id = ?`).get(id));
  }

  function depsReady(dependsOn) {
    return (dependsOn || []).every((depId) => {
      const t = get(depId);
      return Boolean(t && t.state === "COMPLETED");
    });
  }

  function lease({ workerId = "worker-1" } = {}) {
    const leasedId = db.transaction(() => {
      const rows = db
        .prepare(
          `SELECT id, depends_json FROM orch_tasks WHERE state = 'QUEUED'
           ORDER BY CASE priority WHEN 'P0' THEN 0 WHEN 'P1' THEN 1 WHEN 'P2' THEN 2 ELSE 3 END, updated_at ASC`
        )
        .all();
      for (const row of rows) {
        const deps = JSON.parse(row.depends_json || "[]");
        if (!depsReady(deps)) continue;
        const info = db
          .prepare(
            `UPDATE orch_tasks SET state = 'RUNNING', attempts = attempts + 1, lease_owner = ?, updated_at = ?
             WHERE id = ? AND state = 'QUEUED'`
          )
          .run(workerId, new Date().toISOString(), row.id);
        if (info.changes === 1) return row.id;
      }
      return null;
    })();
    if (!leasedId) return { ok: false, code: "EMPTY" };
    audit(leasedId, "LEASE", { workerId });
    return { ok: true, task: get(leasedId) };
  }

  function recoverStale({ now = Date.now() } = {}) {
    const rows = db.prepare(`SELECT id, timeout_ms, updated_at FROM orch_tasks WHERE state = 'RUNNING'`).all();
    let recovered = 0;
    for (const row of rows) {
      const age = now - Date.parse(row.updated_at);
      if (Number.isFinite(age) && age > row.timeout_ms) {
        fail(row.id, { reason: "TIMEOUT" });
        recovered += 1;
      }
    }
    return { ok: true, recovered, production: false };
  }

  function recoverLeases() {
    const stuck = db.prepare(`SELECT id FROM orch_tasks WHERE state = 'RUNNING'`).all();
    const tx = db.transaction(() => {
      for (const s of stuck) {
        db.prepare(
          `UPDATE orch_tasks SET state = 'QUEUED', lease_owner = NULL, updated_at = ? WHERE id = ?`
        ).run(new Date().toISOString(), s.id);
        audit(s.id, "RECOVER_AFTER_CRASH", {});
      }
    });
    tx();
    return { ok: true, recovered: stuck.length, production: false };
  }

  function markTests(id, { testsPassed, acceptancePassed }) {
    db.prepare(`UPDATE orch_tasks SET tests_passed = ?, acceptance_passed = ?, updated_at = ? WHERE id = ?`).run(
      testsPassed ? 1 : 0,
      acceptancePassed ? 1 : 0,
      new Date().toISOString(),
      id
    );
    return { ok: true, task: get(id) };
  }

  function complete(id) {
    const task = get(id);
    if (!task) return { ok: false, code: "NOT_FOUND" };
    if (task.state === "BLOCKED_APPROVAL") return { ok: false, code: "BLOCKED_APPROVAL" };
    if (!task.testsPassed || !task.acceptancePassed) {
      return { ok: false, code: "ACCEPTANCE_OR_TESTS_REQUIRED", completed: false };
    }
    db.prepare(`UPDATE orch_tasks SET state = 'COMPLETED', lease_owner = NULL, updated_at = ? WHERE id = ?`).run(
      new Date().toISOString(),
      id
    );
    audit(id, "COMPLETE", {});
    return { ok: true, task: get(id) };
  }

  function block(id, { reason = "HUMAN_GATE_REQUIRED" } = {}) {
    db.prepare(
      `UPDATE orch_tasks SET state = 'BLOCKED_APPROVAL', lease_owner = NULL, updated_at = ? WHERE id = ?`
    ).run(new Date().toISOString(), id);
    audit(id, "BLOCKED_APPROVAL", { reason });
    return { ok: true, task: get(id) };
  }

  function fail(id, { reason = "FAILED" } = {}) {
    const task = get(id);
    if (!task) return { ok: false, code: "NOT_FOUND" };
    if (task.attempts >= task.maxAttempts) {
      db.prepare(`UPDATE orch_tasks SET state = 'DEAD_LETTER', lease_owner = NULL, updated_at = ? WHERE id = ?`).run(
        new Date().toISOString(),
        id
      );
      db.prepare(`INSERT OR REPLACE INTO orch_dead (task_id, reason, at) VALUES (?,?,?)`).run(
        id,
        reason,
        new Date().toISOString()
      );
      audit(id, "DEAD_LETTER", { reason });
      return { ok: true, task: get(id) };
    }
    db.prepare(`UPDATE orch_tasks SET state = 'QUEUED', lease_owner = NULL, updated_at = ? WHERE id = ?`).run(
      new Date().toISOString(),
      id
    );
    audit(id, "RETRY", { reason });
    return { ok: true, task: get(id) };
  }

  function setPayload(id, payload) {
    db.prepare(`UPDATE orch_tasks SET payload_json = ?, updated_at = ? WHERE id = ?`).run(
      JSON.stringify(payload || {}),
      new Date().toISOString(),
      id
    );
    return { ok: true, task: get(id) };
  }

  function health() {
    const rows = db.prepare(`SELECT state, COUNT(*) AS n FROM orch_tasks GROUP BY state`).all();
    const byState = Object.fromEntries(rows.map((r) => [r.state, r.n]));
    const stale = db.prepare(`SELECT COUNT(*) AS n FROM orch_tasks WHERE state = 'RUNNING'`).get().n;
    const workers = db
      .prepare(`SELECT lease_owner AS workerId, COUNT(*) AS n FROM orch_tasks WHERE lease_owner IS NOT NULL GROUP BY lease_owner`)
      .all();
    return {
      ok: true,
      queued: byState.QUEUED || 0,
      running: byState.RUNNING || 0,
      completed: byState.COMPLETED || 0,
      failed: byState.FAILED || 0,
      blockedApproval: byState.BLOCKED_APPROVAL || 0,
      rejected: byState.REJECTED || 0,
      deadLetter: byState.DEAD_LETTER || 0,
      staleLeases: stale,
      deadLetters: db.prepare(`SELECT COUNT(*) AS n FROM orch_dead`).get().n,
      pendingApprovals: db.prepare(`SELECT COUNT(*) AS n FROM orch_approvals WHERE status = 'WAITING_APPROVAL'`).get().n,
      workers: { healthy: true, live: false, leases: workers },
      byState,
      live: false,
      hostedFactory: false,
      inMemory: false,
    };
  }

  function submitApproval({ taskId, action, requestedBy, reason, risk = "HIGH", ttlMs = 86_400_000, payload = {} } = {}) {
    const existing = db
      .prepare(`SELECT * FROM orch_approvals WHERE task_id = ? AND status = 'WAITING_APPROVAL'`)
      .get(taskId);
    if (existing) return { ok: true, duplicate: true, item: existing };
    const id = `apr_${crypto.randomBytes(6).toString("hex")}`;
    const now = new Date();
    db.prepare(
      `INSERT INTO orch_approvals (id,task_id,action,requested_by,decided_by,status,risk,reason,expires_at,payload_json,created_at,decided_at)
       VALUES (?,?,?,?,NULL,'WAITING_APPROVAL',?,?,?,?,?,NULL)`
    ).run(
      id,
      taskId,
      action,
      requestedBy,
      risk,
      reason || null,
      new Date(now.getTime() + ttlMs).toISOString(),
      JSON.stringify(payload),
      now.toISOString()
    );
    audit(taskId, "APPROVAL_SUBMIT", { id, risk });
    return { ok: true, item: getApproval(id) };
  }

  function getApproval(id) {
    const row = db.prepare(`SELECT * FROM orch_approvals WHERE id = ?`).get(id);
    if (!row) return null;
    return { ...row, payload: JSON.parse(row.payload_json || "{}"), hmacIsSignature: false };
  }

  function listApprovals({ status } = {}) {
    const rows = status
      ? db.prepare(`SELECT * FROM orch_approvals WHERE status = ?`).all(status)
      : db.prepare(`SELECT * FROM orch_approvals`).all();
    return rows.map((r) => ({ ...r, payload: JSON.parse(r.payload_json || "{}") }));
  }

  function releaseToQueued(taskId) {
    db.prepare(
      `UPDATE orch_tasks SET state = 'QUEUED', lease_owner = NULL, updated_at = ? WHERE id = ? AND state = 'BLOCKED_APPROVAL'`
    ).run(new Date().toISOString(), taskId);
    audit(taskId, "RELEASE_AFTER_APPROVAL", {});
    return { ok: true, task: get(taskId) };
  }

  function rejectTerminal(taskId, reason) {
    db.prepare(`UPDATE orch_tasks SET state = 'REJECTED', lease_owner = NULL, updated_at = ? WHERE id = ?`).run(
      new Date().toISOString(),
      taskId
    );
    db.prepare(`INSERT OR REPLACE INTO orch_dead (task_id, reason, at) VALUES (?,?,?)`).run(
      taskId,
      reason || "REJECTED",
      new Date().toISOString()
    );
    audit(taskId, "REJECTED", { reason });
    return { ok: true, task: get(taskId) };
  }

  function decideApproval({ id, approved, actorId }) {
    const DECIDERS = new Set(["human", "operator"]);
    if (!DECIDERS.has(actorId)) return { ok: false, code: "PERMISSION_DENIED" };
    const item = getApproval(id);
    if (!item) return { ok: false, code: "NOT_FOUND" };
    if (item.status !== "WAITING_APPROVAL") return { ok: false, code: "ALREADY_DECIDED" };
    if (Date.parse(item.expires_at) < Date.now()) {
      db.prepare(`UPDATE orch_approvals SET status = 'EXPIRED', decided_at = ? WHERE id = ?`).run(
        new Date().toISOString(),
        id
      );
      return { ok: false, code: "EXPIRED" };
    }
    const status = approved ? "APPROVED" : "REJECTED";
    db.prepare(`UPDATE orch_approvals SET status = ?, decided_by = ?, decided_at = ? WHERE id = ?`).run(
      status,
      actorId,
      new Date().toISOString(),
      id
    );
    audit(item.task_id, "APPROVAL_DECIDE", { id, approved, actorId });
    if (approved) {
      const payload = get(item.task_id)?.payload || {};
      setPayload(item.task_id, { ...payload, humanApproved: true, approvalId: id });
      releaseToQueued(item.task_id);
    } else {
      rejectTerminal(item.task_id, "APPROVAL_REJECTED");
    }
    return { ok: true, item: getApproval(id), task: get(item.task_id) };
  }

  function close() {
    db.close();
  }

  return {
    enqueue,
    get,
    lease,
    recoverLeases,
    recoverStale,
    markTests,
    complete,
    fail,
    block,
    setPayload,
    health,
    submitApproval,
    getApproval,
    listApprovals,
    decideApproval,
    releaseToQueued,
    rejectTerminal,
    close,
    dbPath,
    live: false,
    hostedFactory: false,
  };
}

module.exports = { createDurableTaskQueue, assertNotGuardian };
