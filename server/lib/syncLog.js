const fs = require("fs");
const path = require("path");

const dataDir = path.join(__dirname, "..", "data");
const syncLogFile = path.join(dataDir, "sync-logs.json");
const importLogFile = path.join(dataDir, "import-logs.json");

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
}

function readJson(file) {
  ensureDataDir();
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, "utf8") || "[]");
  } catch {
    return [];
  }
}

function writeJson(file, data) {
  ensureDataDir();
  fs.writeFileSync(file, JSON.stringify(data.slice(-2000), null, 2), "utf8");
}

function createSyncJob({ supplierId, mode }) {
  const job = {
    id: `sync-${Date.now()}`,
    supplier_id: supplierId,
    mode: mode || "manual",
    status: "running",
    started_at: new Date().toISOString(),
    finished_at: null,
    records_read: 0,
    records_created: 0,
    records_updated: 0,
    records_skipped: 0,
    records_failed: 0,
    errors: [],
  };
  const logs = readJson(syncLogFile);
  logs.push(job);
  writeJson(syncLogFile, logs);
  return job;
}

function finishSyncJob(jobId, patch) {
  const logs = readJson(syncLogFile);
  const idx = logs.findIndex((j) => j.id === jobId);
  if (idx < 0) return null;
  logs[idx] = {
    ...logs[idx],
    ...patch,
    finished_at: new Date().toISOString(),
    status: patch.status || "completed",
  };
  writeJson(syncLogFile, logs);
  return logs[idx];
}

function listSyncJobs(limit = 50) {
  return readJson(syncLogFile).slice(-limit).reverse();
}

function logImportRecord(entry) {
  const logs = readJson(importLogFile);
  logs.push({
    id: `imp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    retry_status: "none",
    timestamp: new Date().toISOString(),
    ...entry,
  });
  writeJson(importLogFile, logs);
}

function listImportLogs(limit = 100) {
  return readJson(importLogFile).slice(-limit).reverse();
}

function updateImportLog(id, patch) {
  const logs = readJson(importLogFile);
  const idx = logs.findIndex((l) => l.id === id);
  if (idx < 0) return null;
  logs[idx] = { ...logs[idx], ...patch };
  writeJson(importLogFile, logs);
  return logs[idx];
}

module.exports = {
  createSyncJob,
  finishSyncJob,
  listSyncJobs,
  logImportRecord,
  listImportLogs,
  updateImportLog,
};
