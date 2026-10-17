/**
 * Central AI memory — persisted in the established SQLite database.
 * Distinguishes verified facts, observations, temporary state, analysis, history.
 * Rejects secrets and unauthorized access.
 */

const { db } = require("../db");
const { MEMORY_KIND, BLOCKED_MEMORY_KEYS, DEFAULT_MEMORY_TTL_MS } = require("./constants");
const { newId } = require("./hash");

function parseJson(val, fallback) {
  if (!val) return fallback;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

function containsBlockedKey(value, path = "") {
  if (!value || typeof value !== "object") return null;
  for (const [key, child] of Object.entries(value)) {
    const lower = String(key).toLowerCase();
    if (BLOCKED_MEMORY_KEYS.some((blocked) => lower.includes(blocked))) {
      return path ? `${path}.${key}` : key;
    }
    if (child && typeof child === "object") {
      const nested = containsBlockedKey(child, path ? `${path}.${key}` : key);
      if (nested) return nested;
    }
  }
  return null;
}

function validateRecord({ kind, subject, content, classification }) {
  if (!Object.values(MEMORY_KIND).includes(kind)) {
    return { ok: false, error: "invalid_memory_kind" };
  }
  if (!subject || typeof subject !== "string" || subject.length > 500) {
    return { ok: false, error: "invalid_subject" };
  }
  if (content == null || typeof content !== "object") {
    return { ok: false, error: "invalid_content" };
  }
  const blocked = containsBlockedKey(content);
  if (blocked) {
    return { ok: false, error: "sensitive_field_rejected", field: blocked };
  }
  const classif = classification || kind;
  if (!Object.values(MEMORY_KIND).includes(classif)) {
    return { ok: false, error: "invalid_classification" };
  }
  return { ok: true };
}

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    kind: row.kind,
    subject: row.subject,
    content: parseJson(row.content_json, {}),
    source: row.source,
    classification: row.classification,
    confidence: row.confidence,
    agentId: row.agent_id,
    taskId: row.task_id,
    accessRoles: parseJson(row.access_roles_json, ["ai_agent", "admin"]),
    conflictOf: row.conflict_of,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    expiresAt: row.expires_at,
  };
}

function canAccess(record, role) {
  if (!record) return false;
  if (!role) return false;
  if (role === "admin" || role === "administrator" || role === "super_admin") return true;
  return record.accessRoles.includes(role) || record.accessRoles.includes("ai_agent");
}

function writeMemory({
  kind,
  subject,
  content,
  source,
  classification,
  confidence,
  agentId,
  taskId,
  accessRoles,
  expiresAt,
  ttlMs,
}) {
  const check = validateRecord({ kind, subject, content, classification });
  if (!check.ok) {
    return { ok: false, ...check };
  }
  const esatSecurity = require("./esatSecurity");
  if (esatSecurity.memoryLooksLikePolicyChange(content) || esatSecurity.securityMemoryMayChangePolicy()) {
    return { ok: false, error: "policy_change_rejected" };
  }

  const existing = db
    .prepare(
      `SELECT * FROM core_ai_memory
       WHERE subject = ? AND kind = ? AND conflict_of IS NULL
       ORDER BY created_at DESC LIMIT 1`
    )
    .get(subject, kind);

  let conflictOf = null;
  if (existing) {
    const prev = parseJson(existing.content_json, {});
    if (JSON.stringify(prev) !== JSON.stringify(content)) {
      conflictOf = existing.id;
    } else {
      db.prepare(
        `UPDATE core_ai_memory SET updated_at = CURRENT_TIMESTAMP, source = ?, task_id = COALESCE(?, task_id)
         WHERE id = ?`
      ).run(source || existing.source, taskId || null, existing.id);
      return { ok: true, duplicate: true, record: mapRow(db.prepare("SELECT * FROM core_ai_memory WHERE id = ?").get(existing.id)) };
    }
  }

  const id = newId("mem");
  const classif = classification || kind;
  let expires = expiresAt || null;
  if (!expires && (ttlMs || DEFAULT_MEMORY_TTL_MS[kind])) {
    expires = new Date(Date.now() + (ttlMs || DEFAULT_MEMORY_TTL_MS[kind])).toISOString();
  }

  try {
    db.prepare(
      `INSERT INTO core_ai_memory(
        id, kind, subject, content_json, source, classification, confidence,
        agent_id, task_id, access_roles_json, conflict_of, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      kind,
      subject,
      JSON.stringify(content),
      source || null,
      classif,
      confidence == null ? null : Number(confidence),
      agentId || null,
      taskId || null,
      JSON.stringify(accessRoles || ["ai_agent", "admin"]),
      conflictOf,
      expires
    );
  } catch (error) {
    return { ok: false, error: "database_failure" };
  }

  return {
    ok: true,
    conflict: Boolean(conflictOf),
    conflictOf,
    record: getMemory(id),
  };
}

function getMemory(id, { role } = {}) {
  const row = db.prepare("SELECT * FROM core_ai_memory WHERE id = ?").get(id);
  const record = mapRow(row);
  if (!record) return null;
  if (role && !canAccess(record, role)) return { denied: true, id };
  return record;
}

function readMemory({ subject, kind, taskId, role, includeExpired = false, limit = 50 } = {}) {
  let sql = "SELECT * FROM core_ai_memory WHERE 1=1";
  const params = [];
  if (subject) {
    sql += " AND subject = ?";
    params.push(subject);
  }
  if (kind) {
    sql += " AND kind = ?";
    params.push(kind);
  }
  if (taskId) {
    sql += " AND task_id = ?";
    params.push(taskId);
  }
  if (!includeExpired) {
    sql += " AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)";
  }
  sql += " ORDER BY created_at DESC LIMIT ?";
  params.push(limit);

  try {
    return db
      .prepare(sql)
      .all(...params)
      .map(mapRow)
      .filter((record) => !role || canAccess(record, role));
  } catch (error) {
    return { ok: false, error: "database_failure" };
  }
}

function invalidateMemory(id, { role } = {}) {
  const record = getMemory(id, { role });
  if (!record) return { ok: false, error: "not_found" };
  if (record.denied) return { ok: false, error: "denied" };
  db.prepare(
    "UPDATE core_ai_memory SET expires_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).run(id);
  return { ok: true, invalidated: true, id };
}

function deleteMemory(id, { role } = {}) {
  const record = getMemory(id, { role });
  if (!record) return { ok: false, error: "not_found" };
  if (record.denied) return { ok: false, error: "denied" };
  db.prepare("DELETE FROM core_ai_memory WHERE id = ?").run(id);
  return { ok: true, deleted: true, id };
}

function purgeExpired() {
  const result = db.prepare(
    "DELETE FROM core_ai_memory WHERE expires_at IS NOT NULL AND expires_at <= CURRENT_TIMESTAMP"
  ).run();
  return { deleted: result.changes };
}

function memoryHealth() {
  try {
    const { getPersistenceInfo } = require("../dbPaths");
    const persistence = getPersistenceInfo();
    const counts = db.prepare("SELECT kind, COUNT(*) n FROM core_ai_memory GROUP BY kind").all();
    const total = db.prepare("SELECT COUNT(*) n FROM core_ai_memory").get().n;
    return {
      ok: true,
      persistent: true,
      backend: "sqlite",
      ephemeral: false,
      volatileFallback: false,
      tmpPath: String(persistence.path || "").includes("/tmp"),
      productionPersistent: Boolean(persistence.persistent),
      pathMode: persistence.mode,
      total,
      byKind: Object.fromEntries(counts.map((r) => [r.kind, r.n])),
    };
  } catch (error) {
    return { ok: false, error: "database_failure", persistent: false, volatileFallback: false };
  }
}

module.exports = {
  validateRecord,
  writeMemory,
  getMemory,
  readMemory,
  invalidateMemory,
  deleteMemory,
  purgeExpired,
  memoryHealth,
  canAccess,
  containsBlockedKey,
};
