/**
 * Background job queue foundation — Part 4
 * Uses core_background_jobs table from Part 2.
 */
const crypto = require("crypto");
const { db } = require("./db");

const JOB_STATUS = Object.freeze({
  QUEUED: "QUEUED",
  RUNNING: "RUNNING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  RETRYING: "RETRYING",
  CANCELLED: "CANCELLED",
});

const JOB_PRIORITY = Object.freeze({
  CRITICAL: "CRITICAL",
  HIGH: "HIGH",
  NORMAL: "NORMAL",
  LOW: "LOW",
});

function newId() {
  return `job_${crypto.randomBytes(8).toString("hex")}`;
}

function enqueueJob({ jobType, payload, priority, maxRetries, nextRunAt }) {
  const id = newId();
  const body = {
    ...(payload || {}),
    priority: priority || JOB_PRIORITY.NORMAL,
    maxRetries: maxRetries ?? 3,
  };
  db.prepare(`
    INSERT INTO core_background_jobs(
      id, job_type, status, payload_json, retry_count, next_run_at, created_at
    ) VALUES (?, ?, 'QUEUED', ?, 0, ?, CURRENT_TIMESTAMP)
  `).run(
    id,
    jobType,
    JSON.stringify(body),
    nextRunAt || new Date().toISOString()
  );
  return getJob(id);
}

function getJob(id) {
  const row = db.prepare("SELECT * FROM core_background_jobs WHERE id = ?").get(id);
  if (!row) return null;
  return mapRow(row);
}

function mapRow(row) {
  const payload = parseJson(row.payload_json, {});
  return {
    id: row.id,
    jobType: row.job_type,
    status: row.status,
    payload,
    priority: payload.priority || JOB_PRIORITY.NORMAL,
    result: parseJson(row.result_json, null),
    error: row.error_message,
    retryCount: row.retry_count,
    maxRetries: payload.maxRetries ?? 3,
    nextRunAt: row.next_run_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  };
}

function parseJson(val, fallback) {
  if (!val) return fallback;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

function listJobs({ status, limit = 50, offset = 0 } = {}) {
  let sql = "SELECT * FROM core_background_jobs WHERE 1=1";
  const params = [];
  if (status) {
    sql += " AND status = ?";
    params.push(status);
  }
  sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);
  return db.prepare(sql).all(...params).map(mapRow);
}

function updateJobStatus(id, status, { error, result, retryCount } = {}) {
  const fields = ["status = ?"];
  const params = [status];
  if (status === JOB_STATUS.RUNNING) fields.push("started_at = COALESCE(started_at, CURRENT_TIMESTAMP)");
  if ([JOB_STATUS.COMPLETED, JOB_STATUS.FAILED, JOB_STATUS.CANCELLED].includes(status)) {
    fields.push("completed_at = CURRENT_TIMESTAMP");
  }
  if (error !== undefined) {
    fields.push("error_message = ?");
    params.push(error);
  }
  if (result !== undefined) {
    fields.push("result_json = ?");
    params.push(JSON.stringify(result));
  }
  if (retryCount !== undefined) {
    fields.push("retry_count = ?");
    params.push(retryCount);
  }
  params.push(id);
  db.prepare(`UPDATE core_background_jobs SET ${fields.join(", ")} WHERE id = ?`).run(...params);
  return getJob(id);
}

async function processNextQueued(handlers = {}) {
  const row = db.prepare(`
    SELECT * FROM core_background_jobs
    WHERE status IN ('QUEUED', 'RETRYING')
    ORDER BY created_at ASC LIMIT 1
  `).get();
  if (!row) return null;

  const handler = handlers[row.job_type];
  updateJobStatus(row.id, JOB_STATUS.RUNNING);

  if (!handler) {
    return updateJobStatus(row.id, JOB_STATUS.FAILED, { error: `No handler for ${row.job_type}` });
  }

  try {
    const result = await handler(parseJson(row.payload_json, {}));
    return updateJobStatus(row.id, JOB_STATUS.COMPLETED, { result });
  } catch (err) {
    const payload = parseJson(row.payload_json, {});
    const retry = (row.retry_count || 0) + 1;
    if (retry < (payload.maxRetries ?? 3)) {
      return updateJobStatus(row.id, JOB_STATUS.RETRYING, { error: err.message, retryCount: retry });
    }
    return updateJobStatus(row.id, JOB_STATUS.FAILED, { error: err.message, retryCount: retry });
  }
}

module.exports = {
  JOB_STATUS,
  JOB_PRIORITY,
  enqueueJob,
  getJob,
  listJobs,
  updateJobStatus,
  processNextQueued,
};
