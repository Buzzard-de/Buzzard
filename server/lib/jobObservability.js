/**
 * Part 5 — Job execution observability logs.
 */
const crypto = require("crypto");
const { db } = require("./db");

function newId() {
  return `jlog_${crypto.randomBytes(6).toString("hex")}`;
}

function appendJobLog(jobId, message, { level = "INFO", metadata } = {}) {
  const id = newId();
  db.prepare(`
    INSERT INTO core_job_logs(id, job_id, level, message, metadata_json)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, jobId, level, message, JSON.stringify(metadata || {}));
  return id;
}

function listJobLogs(jobId, limit = 100) {
  return db.prepare(`
    SELECT * FROM core_job_logs WHERE job_id = ? ORDER BY created_at DESC LIMIT ?
  `).all(jobId, limit).map((row) => ({
    id: row.id,
    jobId: row.job_id,
    level: row.level,
    message: row.message,
    metadata: parseJson(row.metadata_json, {}),
    createdAt: row.created_at,
  }));
}

function parseJson(val, fallback) {
  try {
    return JSON.parse(val || "{}");
  } catch {
    return fallback;
  }
}

module.exports = { appendJobLog, listJobLogs };
