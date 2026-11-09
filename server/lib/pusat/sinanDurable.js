/**
 * Persistent Sinan Bey tables on the existing Pusat sqlite. Additive only.
 */
const crypto = require("crypto");
const { SECTIONS, encodeRecord } = require("./sinanMemory");

const TASK_STATUS = Object.freeze([
  "NOT_STARTED",
  "IN_PROGRESS",
  "BLOCKED",
  "CODE_READY",
  "TESTED",
  "SECURITY_REVIEWED",
  "HUMAN_APPROVED",
  "LIVE_VERIFIED",
]);

function ensureSinanSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sinan_tasks (
      id TEXT PRIMARY KEY,
      from_id TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL,
      blocked_reason TEXT,
      branch TEXT,
      commit_sha TEXT,
      test_result TEXT,
      evidence_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sinan_reports (
      id TEXT PRIMARY KEY,
      task_id TEXT,
      kind TEXT NOT NULL,
      body_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sinan_audit (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      actor TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sinan_memory_versions (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      section TEXT NOT NULL,
      mem_key TEXT NOT NULL,
      version INTEGER NOT NULL,
      encryption TEXT NOT NULL,
      value_json TEXT NOT NULL,
      iv TEXT,
      source TEXT,
      created_at TEXT NOT NULL
    );
  `);
}

function createSinanDurable(db) {
  if (!db) throw new Error("sinan durable requires db");
  ensureSinanSchema(db);

  function audit(kind, actor, payload) {
    const id = `saud_${crypto.randomBytes(6).toString("hex")}`;
    const at = new Date().toISOString();
    db.prepare(`INSERT INTO sinan_audit (id, kind, actor, payload_json, created_at) VALUES (?,?,?,?,?)`).run(
      id,
      kind,
      actor,
      JSON.stringify(payload || {}),
      at,
    );
    return { id, kind, actor, at };
  }

  function assignTask({ fromId = "pusat", title } = {}) {
    const id = `stask_${crypto.randomBytes(6).toString("hex")}`;
    const at = new Date().toISOString();
    db.prepare(
      `INSERT INTO sinan_tasks (id, from_id, title, status, blocked_reason, branch, commit_sha, test_result, evidence_json, created_at, updated_at)
       VALUES (?,?,?,?,NULL,NULL,NULL,NULL,'{}',?,?)`,
    ).run(id, fromId, title || "untitled", "NOT_STARTED", at, at);
    audit("task.assign", fromId, { id, title });
    return { id, fromId, title: title || "untitled", status: "NOT_STARTED" };
  }

  function setStatus({ taskId, status, blockedReason, branch, commitSha, testResult, evidence } = {}) {
    if (!TASK_STATUS.includes(status)) return { ok: false, code: "UNKNOWN_STATUS" };
    if (status === "LIVE_VERIFIED") return { ok: false, code: "LIVE_VERIFIED_FORBIDDEN" };
    const row = db.prepare(`SELECT * FROM sinan_tasks WHERE id = ?`).get(taskId);
    if (!row) return { ok: false, code: "NOT_FOUND" };
    const at = new Date().toISOString();
    db.prepare(
      `UPDATE sinan_tasks SET status = ?, blocked_reason = ?, branch = ?, commit_sha = ?, test_result = ?, evidence_json = ?, updated_at = ? WHERE id = ?`,
    ).run(
      status,
      blockedReason || null,
      branch || row.branch,
      commitSha || row.commit_sha,
      testResult || row.test_result,
      JSON.stringify(evidence || JSON.parse(row.evidence_json || "{}")),
      at,
      taskId,
    );
    audit("task.status", "sinan_bey", { taskId, status });
    return { ok: true, taskId, status };
  }

  function report({ taskId, kind, body } = {}) {
    const id = `srep_${crypto.randomBytes(6).toString("hex")}`;
    const at = new Date().toISOString();
    db.prepare(`INSERT INTO sinan_reports (id, task_id, kind, body_json, created_at) VALUES (?,?,?,?,?)`).run(
      id,
      taskId || null,
      kind || "status",
      JSON.stringify(body || {}),
      at,
    );
    audit("report", "sinan_bey", { id, taskId, kind });
    return { ok: true, id, taskId, kind: kind || "status" };
  }

  function getTask(taskId) {
    const row = db.prepare(`SELECT * FROM sinan_tasks WHERE id = ?`).get(taskId);
    if (!row) return { ok: false, code: "NOT_FOUND" };
    return { ok: true, task: { ...row, evidence: JSON.parse(row.evidence_json || "{}") } };
  }

  function listTasks() {
    return db.prepare(`SELECT * FROM sinan_tasks ORDER BY created_at DESC LIMIT 100`).all();
  }

  function snapshotMemory(ownerId = "sinan_bey") {
    const records = db
      .prepare(`SELECT id, key, value_json, created_at FROM pusat_memories WHERE owner_id = ?`)
      .all(ownerId);
    return {
      ownerId,
      at: new Date().toISOString(),
      records: records.map((r) => ({ id: r.id, key: r.key, value: JSON.parse(r.value_json), at: r.created_at })),
      live: false,
    };
  }

  function restoreMemorySnapshot(snapshot, { ownerId = "sinan_bey" } = {}) {
    if (!snapshot || snapshot.ownerId !== ownerId) return { ok: false, code: "OWNER_MISMATCH" };
    const insert = db.prepare(
      `INSERT OR REPLACE INTO pusat_memories (id, owner_id, classification, key, value_json, created_at) VALUES (?,?,?,?,?,?)`,
    );
    for (const rec of snapshot.records || []) {
      insert.run(rec.id, ownerId, "personal", rec.key, JSON.stringify(rec.value ?? null), rec.at);
    }
    audit("memory.restore", "sinan_bey", { count: (snapshot.records || []).length });
    return { ok: true, restored: (snapshot.records || []).length, live: false, offsite: false };
  }

  function putPartitioned({ section, key, value, source } = {}) {
    if (!SECTIONS[section] && !Object.values(SECTIONS).includes(section)) {
      return { ok: false, code: "UNKNOWN_SECTION" };
    }
    const sectionName = SECTIONS[section] || section;
    const last = db
      .prepare(
        `SELECT MAX(version) v FROM sinan_memory_versions WHERE owner_id = ? AND section = ? AND mem_key = ?`,
      )
      .get("sinan_bey", sectionName, key);
    const version = Number(last?.v || 0) + 1;
    const enc = encodeRecord({ section: sectionName, key, value, source });
    const id = `smem_${crypto.randomBytes(6).toString("hex")}`;
    const at = new Date().toISOString();
    db.prepare(
      `INSERT INTO sinan_memory_versions (id, owner_id, section, mem_key, version, encryption, value_json, iv, source, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
    ).run(
      id,
      "sinan_bey",
      sectionName,
      key,
      version,
      enc.encryption,
      enc.ciphertext,
      enc.iv,
      source || "sinan_bey",
      at,
    );
    audit("memory.partition.put", "sinan_bey", { section: sectionName, key, version, encryption: enc.encryption });
    return { ok: true, id, section: sectionName, key, version, encryption: enc.encryption };
  }

  function listPartition(section) {
    const sectionName = SECTIONS[section] || section;
    return db
      .prepare(
        `SELECT id, section, mem_key, version, encryption, created_at FROM sinan_memory_versions WHERE owner_id = ? AND section = ? ORDER BY version`,
      )
      .all("sinan_bey", sectionName);
  }

  function listAudit() {
    return db.prepare(`SELECT * FROM sinan_audit ORDER BY created_at DESC LIMIT 100`).all();
  }

  return {
    assignTask,
    setStatus,
    report,
    getTask,
    listTasks,
    snapshotMemory,
    restoreMemorySnapshot,
    putPartitioned,
    listPartition,
    listAudit,
    audit,
  };
}

module.exports = { TASK_STATUS, ensureSinanSchema, createSinanDurable, SECTIONS: require("./sinanMemory").SECTIONS };
