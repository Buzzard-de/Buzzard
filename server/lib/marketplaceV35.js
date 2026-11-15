const { db } = require("./db");

function isEnabled() {
  return process.env.BUZZARD_MARKETPLACE_V35 !== "0" && process.env.BUZZARD_DB_ENABLED !== "0";
}

function closed(code) {
  return { ok: false, code, created: false, stored: false, queued: false, live: false, published: false };
}

function createRecord() {
  return closed("MARKETPLACE_NOT_LIVE");
}

function listRecords() {
  return db.prepare("SELECT * FROM mkt35_records ORDER BY id DESC").all();
}

function getRecordByCode(code) {
  return db.prepare("SELECT * FROM mkt35_records WHERE code = ?").get(code);
}

function updateRecord() {
  return closed("MARKETPLACE_NOT_LIVE");
}

function createJob() {
  return closed("MARKETPLACE_SYNC_NOT_LIVE");
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
