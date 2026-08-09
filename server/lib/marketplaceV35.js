const { db } = require("./db");

function isEnabled() {
  return process.env.BUZZARD_MARKETPLACE_V35 !== "0" && process.env.BUZZARD_DB_ENABLED !== "0";
}

function createRecord(body = {}) {
  if (!body.code || !body.name) {
    return { error: "code and name required", status: 400 };
  }
  try {
    const result = db
      .prepare(`
        INSERT INTO mkt35_records(code, name, status, data_json)
        VALUES(?,?,?,?)
      `)
      .run(body.code, body.name, body.status || "active", JSON.stringify(body.data || {}));
    return {
      record: db.prepare("SELECT * FROM mkt35_records WHERE id = ?").get(result.lastInsertRowid),
      created: true,
    };
  } catch {
    return { error: "code already exists", status: 409 };
  }
}

function listRecords() {
  return db.prepare("SELECT * FROM mkt35_records ORDER BY id DESC").all();
}

function getRecordByCode(code) {
  return db.prepare("SELECT * FROM mkt35_records WHERE code = ?").get(code);
}

function updateRecord(id, body = {}) {
  const existing = db.prepare("SELECT * FROM mkt35_records WHERE id = ?").get(id);
  if (!existing) return { error: "not found", status: 404 };
  db.prepare(`
    UPDATE mkt35_records
    SET name = ?, status = ?, data_json = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    body.name ?? existing.name,
    body.status ?? existing.status,
    JSON.stringify(body.data ?? JSON.parse(existing.data_json || "{}")),
    existing.id
  );
  return { record: db.prepare("SELECT * FROM mkt35_records WHERE id = ?").get(existing.id) };
}

function createJob(body = {}) {
  const result = db
    .prepare(`
      INSERT INTO mkt35_jobs(type, payload_json)
      VALUES(?,?)
    `)
    .run(body.type || "sync", JSON.stringify(body.payload || {}));
  return { jobId: result.lastInsertRowid, status: "queued" };
}

function listJobs() {
  return db.prepare("SELECT * FROM mkt35_jobs ORDER BY id DESC LIMIT 200").all();
}

function getMarketplaceV35Overview() {
  return {
    records: db.prepare("SELECT COUNT(*) n FROM mkt35_records").get().n,
    active: db.prepare("SELECT COUNT(*) n FROM mkt35_records WHERE status = 'active'").get().n,
    jobs: db.prepare("SELECT COUNT(*) n FROM mkt35_jobs").get().n,
    queuedJobs: db.prepare("SELECT COUNT(*) n FROM mkt35_jobs WHERE status = 'queued'").get().n,
  };
}

function getMarketplaceV35Status() {
  const overview = getMarketplaceV35Overview();
  return {
    version: "3.5.0",
    module: "Marketplace Integration",
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
  getMarketplaceV35Overview,
  getMarketplaceV35Status,
};
