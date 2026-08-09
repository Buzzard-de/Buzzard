const { db } = require("./db");

function isEnabled() {
  return process.env.BUZZARD_ORDER_MANAGEMENT_V32 !== "0" && process.env.BUZZARD_DB_ENABLED !== "0";
}

function createRecord(body = {}) {
  if (!body.code || !body.name) {
    return { error: "code and name required", status: 400 };
  }
  try {
    const result = db
      .prepare(`
        INSERT INTO oms32_records(code, name, status, data_json)
        VALUES(?,?,?,?)
      `)
      .run(body.code, body.name, body.status || "active", JSON.stringify(body.data || {}));
    return {
      record: db.prepare("SELECT * FROM oms32_records WHERE id = ?").get(result.lastInsertRowid),
      created: true,
    };
  } catch {
    return { error: "code already exists", status: 409 };
  }
}

function listRecords() {
  return db.prepare("SELECT * FROM oms32_records ORDER BY id DESC").all();
}

function getRecordByCode(code) {
  return db.prepare("SELECT * FROM oms32_records WHERE code = ?").get(code);
}

function updateRecord(id, body = {}) {
  const existing = db.prepare("SELECT * FROM oms32_records WHERE id = ?").get(id);
  if (!existing) return { error: "not found", status: 404 };
  db.prepare(`
    UPDATE oms32_records
    SET name = ?, status = ?, data_json = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    body.name ?? existing.name,
    body.status ?? existing.status,
    JSON.stringify(body.data ?? JSON.parse(existing.data_json || "{}")),
    existing.id
  );
  return { record: db.prepare("SELECT * FROM oms32_records WHERE id = ?").get(existing.id) };
}

function createJob(body = {}) {
  const result = db
    .prepare(`
      INSERT INTO oms32_jobs(type, payload_json)
      VALUES(?,?)
    `)
    .run(body.type || "sync", JSON.stringify(body.payload || {}));
  return { jobId: result.lastInsertRowid, status: "queued" };
}

function listJobs() {
  return db.prepare("SELECT * FROM oms32_jobs ORDER BY id DESC LIMIT 200").all();
}

function getOrderManagementV32Overview() {
  return {
    records: db.prepare("SELECT COUNT(*) n FROM oms32_records").get().n,
    active: db.prepare("SELECT COUNT(*) n FROM oms32_records WHERE status = 'active'").get().n,
    jobs: db.prepare("SELECT COUNT(*) n FROM oms32_jobs").get().n,
    queuedJobs: db.prepare("SELECT COUNT(*) n FROM oms32_jobs WHERE status = 'queued'").get().n,
  };
}

function getOrderManagementV32Status() {
  const overview = getOrderManagementV32Overview();
  return {
    version: "3.2.0",
    module: "Order Management System",
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
  getOrderManagementV32Overview,
  getOrderManagementV32Status,
};
