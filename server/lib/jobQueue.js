/**
 * Part 5 — Enhanced job queue with locking, priority, dead-letter.
 */
const crypto = require("crypto");
const { db } = require("./db");
const {
  JOB_STATUS,
  JOB_PRIORITY,
  PRIORITY_WEIGHT,
  DEFAULT_MAX_RETRIES,
  DEFAULT_LOCK_TTL_MS,
} = require("../core/jobConstants");

function newId() {
  return `job_${crypto.randomBytes(8).toString("hex")}`;
}

function parseJson(val, fallback) {
  if (!val) return fallback;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

function priorityWeight(priority) {
  return PRIORITY_WEIGHT[priority] || PRIORITY_WEIGHT.NORMAL;
}

function mapRow(row) {
  const payload = parseJson(row.payload_json, {});
  return {
    id: row.id,
    jobType: row.job_type,
    status: row.status,
    payload,
    priority: row.priority || payload.priority || JOB_PRIORITY.NORMAL,
    result: parseJson(row.result_json, null),
    error: row.error_message,
    retryCount: row.retry_count,
    maxRetries: payload.maxRetries ?? DEFAULT_MAX_RETRIES,
    nextRunAt: row.next_run_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    lockOwner: row.lock_owner || null,
    lockExpiresAt: row.lock_expires_at || null,
    workerId: row.worker_id || null,
    scheduleId: row.schedule_id || null,
    executionMs: row.execution_ms || null,
    failureKind: row.failure_kind || null,
  };
}

function enqueueJob({
  jobType,
  payload,
  priority,
  maxRetries,
  nextRunAt,
  scheduleId,
  createdBy,
}) {
  const id = newId();
  const pri = priority || JOB_PRIORITY.NORMAL;
  const body = {
    ...(payload || {}),
    priority: pri,
    maxRetries: maxRetries ?? DEFAULT_MAX_RETRIES,
    createdBy: createdBy || null,
  };
  db.prepare(`
    INSERT INTO core_background_jobs(
      id, job_type, status, payload_json, retry_count, next_run_at, priority, schedule_id, created_at
    ) VALUES (?, ?, 'QUEUED', ?, 0, ?, ?, ?, CURRENT_TIMESTAMP)
  `).run(
    id,
    jobType,
    JSON.stringify(body),
    nextRunAt || new Date().toISOString(),
    pri,
    scheduleId || null
  );
  return getJob(id);
}

function getJob(id) {
  const row = db.prepare("SELECT * FROM core_background_jobs WHERE id = ?").get(id);
  return row ? mapRow(row) : null;
}

function listJobs({ status, jobType, limit = 50, offset = 0 } = {}) {
  let sql = "SELECT * FROM core_background_jobs WHERE 1=1";
  const params = [];
  if (status) {
    sql += " AND status = ?";
    params.push(status);
  }
  if (jobType) {
    sql += " AND job_type = ?";
    params.push(jobType);
  }
  sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);
  return db.prepare(sql).all(...params).map(mapRow);
}

function countJobsByStatus() {
  const rows = db.prepare(`
    SELECT status, COUNT(*) n FROM core_background_jobs GROUP BY status
  `).all();
  return Object.fromEntries(rows.map((r) => [r.status, r.n]));
}

function updateJob(id, fields) {
  const sets = ["updated_at = CURRENT_TIMESTAMP"];
  const params = [];
  if (fields.status !== undefined) {
    sets.push("status = ?");
    params.push(fields.status);
  }
  if (fields.error !== undefined) {
    sets.push("error_message = ?");
    params.push(fields.error);
  }
  if (fields.result !== undefined) {
    sets.push("result_json = ?");
    params.push(JSON.stringify(fields.result));
  }
  if (fields.retryCount !== undefined) {
    sets.push("retry_count = ?");
    params.push(fields.retryCount);
  }
  if (fields.lockOwner !== undefined) {
    sets.push("lock_owner = ?");
    params.push(fields.lockOwner);
  }
  if (fields.lockExpiresAt !== undefined) {
    sets.push("lock_expires_at = ?");
    params.push(fields.lockExpiresAt);
  }
  if (fields.workerId !== undefined) {
    sets.push("worker_id = ?");
    params.push(fields.workerId);
  }
  if (fields.executionMs !== undefined) {
    sets.push("execution_ms = ?");
    params.push(fields.executionMs);
  }
  if (fields.failureKind !== undefined) {
    sets.push("failure_kind = ?");
    params.push(fields.failureKind);
  }
  if (fields.status === JOB_STATUS.RUNNING) {
    sets.push("started_at = COALESCE(started_at, CURRENT_TIMESTAMP)");
  }
  if ([JOB_STATUS.COMPLETED, JOB_STATUS.FAILED, JOB_STATUS.CANCELLED, JOB_STATUS.DEAD_LETTER].includes(fields.status)) {
    sets.push("completed_at = CURRENT_TIMESTAMP");
    sets.push("lock_owner = NULL");
    sets.push("lock_expires_at = NULL");
  }
  params.push(id);
  db.prepare(`UPDATE core_background_jobs SET ${sets.join(", ")} WHERE id = ?`).run(...params);
  return getJob(id);
}

function releaseStaleLocks(now = new Date()) {
  const iso = now.toISOString();
  const stale = db.prepare(`
    SELECT id FROM core_background_jobs
    WHERE status = 'RUNNING'
    AND lock_expires_at IS NOT NULL
    AND lock_expires_at < ?
  `).all(iso);

  for (const row of stale) {
    updateJob(row.id, {
      status: JOB_STATUS.RETRYING,
      error: "Lock expired — worker may have crashed",
      lockOwner: null,
      lockExpiresAt: null,
    });
  }
  return stale.length;
}

function claimNextJob(workerId, lockTtlMs = DEFAULT_LOCK_TTL_MS) {
  releaseStaleLocks();
  const now = new Date();
  const lockExpires = new Date(now.getTime() + lockTtlMs).toISOString();
  const nowIso = now.toISOString();

  const candidates = db.prepare(`
    SELECT * FROM core_background_jobs
    WHERE status IN ('QUEUED', 'RETRYING')
    AND (next_run_at IS NULL OR next_run_at <= ?)
    AND (lock_owner IS NULL OR lock_expires_at IS NULL OR lock_expires_at < ?)
    ORDER BY
      CASE priority
        WHEN 'CRITICAL' THEN 4 WHEN 'HIGH' THEN 3 WHEN 'NORMAL' THEN 2 WHEN 'LOW' THEN 1 ELSE 2
      END DESC,
      created_at ASC
    LIMIT 5
  `).all(nowIso, nowIso);

  for (const row of candidates) {
    const result = db.prepare(`
      UPDATE core_background_jobs
      SET status = 'RUNNING', lock_owner = ?, lock_expires_at = ?, worker_id = ?, updated_at = CURRENT_TIMESTAMP,
          started_at = COALESCE(started_at, CURRENT_TIMESTAMP)
      WHERE id = ? AND status IN ('QUEUED', 'RETRYING')
      AND (lock_owner IS NULL OR lock_expires_at IS NULL OR lock_expires_at < ?)
    `).run(workerId, lockExpires, workerId, row.id, nowIso);

    if (result.changes === 1) {
      return getJob(row.id);
    }
  }
  return null;
}

function cancelJob(id) {
  const job = getJob(id);
  if (!job) return null;
  if ([JOB_STATUS.COMPLETED, JOB_STATUS.CANCELLED].includes(job.status)) return job;
  return updateJob(id, { status: JOB_STATUS.CANCELLED, error: "Cancelled by admin" });
}

function retryJob(id) {
  const job = getJob(id);
  if (!job) return null;
  if (![JOB_STATUS.FAILED, JOB_STATUS.DEAD_LETTER, JOB_STATUS.RETRYING].includes(job.status)) {
    throw new Error(`Cannot retry job in status ${job.status}`);
  }
  db.prepare(`
    UPDATE core_background_jobs SET
      status = 'QUEUED', error_message = NULL, retry_count = 0,
      lock_owner = NULL, lock_expires_at = NULL,
      next_run_at = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(new Date().toISOString(), id);
  return getJob(id);
}

function markDeadLetter(id, error, failureKind) {
  return updateJob(id, {
    status: JOB_STATUS.DEAD_LETTER,
    error,
    failureKind,
  });
}

function extendLock(id, workerId, lockTtlMs = DEFAULT_LOCK_TTL_MS) {
  const lockExpires = new Date(Date.now() + lockTtlMs).toISOString();
  const result = db.prepare(`
    UPDATE core_background_jobs SET lock_expires_at = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND lock_owner = ? AND status = 'RUNNING'
  `).run(lockExpires, id, workerId);
  return result.changes === 1;
}

module.exports = {
  JOB_STATUS,
  JOB_PRIORITY,
  enqueueJob,
  getJob,
  listJobs,
  countJobsByStatus,
  updateJob,
  claimNextJob,
  releaseStaleLocks,
  cancelJob,
  retryJob,
  markDeadLetter,
  extendLock,
  priorityWeight,
  parseJson,
};
