const { db } = require("./db");

function isEnabled() {
  return process.env.BUZZARD_SECURITY_V38 !== "0" && process.env.BUZZARD_DB_ENABLED !== "0";
}

function createRecord(body = {}) {
  if (!body.code || !body.name) {
    return { error: "code and name required", status: 400 };
  }
  try {
    const result = db
      .prepare(`
        INSERT INTO sec38_records(code, name, status, data_json)
        VALUES(?,?,?,?)
      `)
      .run(body.code, body.name, body.status || "active", JSON.stringify(body.data || {}));
    return {
      record: db.prepare("SELECT * FROM sec38_records WHERE id = ?").get(result.lastInsertRowid),
      created: true,
    };
  } catch {
    return { error: "code already exists", status: 409 };
  }
}

function listRecords() {
  return db.prepare("SELECT * FROM sec38_records ORDER BY id DESC").all();
}

function getRecordByCode(code) {
  return db.prepare("SELECT * FROM sec38_records WHERE code = ?").get(code);
}

function updateRecord(id, body = {}) {
  const existing = db.prepare("SELECT * FROM sec38_records WHERE id = ?").get(id);
  if (!existing) return { error: "not found", status: 404 };
  db.prepare(`
    UPDATE sec38_records
    SET name = ?, status = ?, data_json = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    body.name ?? existing.name,
    body.status ?? existing.status,
    JSON.stringify(body.data ?? JSON.parse(existing.data_json || "{}")),
    existing.id
  );
  return { record: db.prepare("SELECT * FROM sec38_records WHERE id = ?").get(existing.id) };
}

function createJob(body = {}) {
  const result = db
    .prepare(`
      INSERT INTO sec38_jobs(type, payload_json)
      VALUES(?,?)
    `)
    .run(body.type || "sync", JSON.stringify(body.payload || {}));
  return { jobId: result.lastInsertRowid, status: "queued" };
}

function listJobs() {
  return db.prepare("SELECT * FROM sec38_jobs ORDER BY id DESC LIMIT 200").all();
}

function getSecurityV38Overview() {
  return {
    records: db.prepare("SELECT COUNT(*) n FROM sec38_records").get().n,
    active: db.prepare("SELECT COUNT(*) n FROM sec38_records WHERE status = 'active'").get().n,
    jobs: db.prepare("SELECT COUNT(*) n FROM sec38_jobs").get().n,
    queuedJobs: db.prepare("SELECT COUNT(*) n FROM sec38_jobs WHERE status = 'queued'").get().n,
  };
}

function getSecurityV38Status() {
  const overview = getSecurityV38Overview();
  return {
    version: "3.8.0",
    module: "Security & Compliance",
    enabled: isEnabled(),
    totals: overview,
    overview,
  };
}

module.exports = {
  isEnabled,
  createRecord,
  listRecords,
  getRecordByCode,
  updateRecord,
  createJob,
  listJobs,
  getSecurityV38Overview,
  getSecurityV38Status,
};
