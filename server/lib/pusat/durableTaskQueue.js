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
      "{}"
    );
    audit(id, "ENQUEUE", { ownerId });
    return { ok: true, task: get(id) };
  }

  function get(id) {
    return rowToTask(db.prepare(`SELECT * FROM orch_tasks WHERE id = ?`).get(id));
  }

  function lease({ workerId = "worker-1" } = {}) {
    const leasedId = db.transaction(() => {
      const row = db
        .prepare(
          `SELECT id FROM orch_tasks WHERE state = 'QUEUED'
           ORDER BY CASE priority WHEN 'P0' THEN 0 WHEN 'P1' THEN 1 WHEN 'P2' THEN 2 ELSE 3 END, updated_at ASC
           LIMIT 1`
        )
        .get();
      if (!row) return null;
      const info = db
        .prepare(
          `UPDATE orch_tasks SET state = 'RUNNING', attempts = attempts + 1, lease_owner = ?, updated_at = ?
           WHERE id = ? AND state = 'QUEUED'`
        )
        .run(workerId, new Date().toISOString(), row.id);
      if (info.changes !== 1) return null;
      return row.id;
    })();
    if (!leasedId) return { ok: false, code: "EMPTY" };
    audit(leasedId, "LEASE", { workerId });
    return { ok: true, task: get(leasedId) };
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

  function close() {
    db.close();
  }

  return {
    enqueue,
    get,
    lease,
    recoverLeases,
    markTests,
    complete,
    fail,
    close,
    dbPath,
    live: false,
    hostedFactory: false,
  };
}

module.exports = { createDurableTaskQueue, assertNotGuardian };
