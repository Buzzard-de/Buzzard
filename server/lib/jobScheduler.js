/**
 * Part 5 — Job scheduler (one-time, recurring, delayed).
 */
const crypto = require("crypto");
const { db } = require("./db");
const jobQueue = require("./jobQueue");
const { SCHEDULE_TYPE, JOB_PRIORITY } = require("../core/jobConstants");

function newId() {
  return `sched_${crypto.randomBytes(8).toString("hex")}`;
}

function parseJson(val, fallback) {
  try {
    return JSON.parse(val || "{}");
  } catch {
    return fallback;
  }
}

function mapRow(row) {
  return {
    id: row.id,
    name: row.name,
    jobType: row.job_type,
    scheduleType: row.schedule_type,
    cronExpr: row.cron_expr,
    intervalMs: row.interval_ms,
    payload: parseJson(row.payload_json, {}),
    priority: row.priority || JOB_PRIORITY.NORMAL,
    enabled: Boolean(row.enabled),
    nextRunAt: row.next_run_at,
    lastRunAt: row.last_run_at,
    runCount: row.run_count,
    maxRetries: row.max_retries,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

function computeNextRun(schedule, from = new Date()) {
  if (schedule.scheduleType === SCHEDULE_TYPE.ONE_TIME) {
    return schedule.nextRunAt || from.toISOString();
  }
  if (schedule.scheduleType === SCHEDULE_TYPE.DELAYED) {
    const delay = schedule.intervalMs || 60_000;
    return new Date(from.getTime() + delay).toISOString();
  }
  if (schedule.scheduleType === SCHEDULE_TYPE.RECURRING) {
    const interval = schedule.intervalMs || 3600_000;
    return new Date(from.getTime() + interval).toISOString();
  }
  return from.toISOString();
}

function createSchedule({
  name,
  jobType,
  scheduleType,
  cronExpr,
  intervalMs,
  payload,
  priority,
  nextRunAt,
  maxRetries,
  createdBy,
  enabled = true,
}) {
  const id = newId();
  const next = nextRunAt || computeNextRun({ scheduleType, intervalMs }, new Date());
  db.prepare(`
    INSERT INTO core_scheduled_jobs(
      id, name, job_type, schedule_type, cron_expr, interval_ms, payload_json,
      priority, enabled, next_run_at, max_retries, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    name,
    jobType,
    scheduleType,
    cronExpr || null,
    intervalMs || null,
    JSON.stringify(payload || {}),
    priority || JOB_PRIORITY.NORMAL,
    enabled ? 1 : 0,
    next,
    maxRetries ?? 3,
    createdBy || null
  );
  return getSchedule(id);
}

function getSchedule(id) {
  const row = db.prepare("SELECT * FROM core_scheduled_jobs WHERE id = ?").get(id);
  return row ? mapRow(row) : null;
}

function listSchedules({ enabled, limit = 50 } = {}) {
  let sql = "SELECT * FROM core_scheduled_jobs WHERE 1=1";
  const params = [];
  if (enabled !== undefined) {
    sql += " AND enabled = ?";
    params.push(enabled ? 1 : 0);
  }
  sql += " ORDER BY next_run_at ASC LIMIT ?";
  params.push(limit);
  return db.prepare(sql).all(...params).map(mapRow);
}

function disableSchedule(id) {
  db.prepare("UPDATE core_scheduled_jobs SET enabled = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
  return getSchedule(id);
}

function tickScheduler(now = new Date()) {
  const due = db.prepare(`
    SELECT * FROM core_scheduled_jobs
    WHERE enabled = 1 AND next_run_at <= ?
    ORDER BY next_run_at ASC LIMIT 10
  `).all(now.toISOString());

  const enqueued = [];
  for (const row of due) {
    const schedule = mapRow(row);
    const job = jobQueue.enqueueJob({
      jobType: schedule.jobType,
      payload: { ...schedule.payload, scheduleName: schedule.name },
      priority: schedule.priority,
      maxRetries: schedule.maxRetries,
      scheduleId: schedule.id,
      createdBy: schedule.createdBy,
    });
    enqueued.push(job);

    if (schedule.scheduleType === SCHEDULE_TYPE.ONE_TIME) {
      db.prepare(`
        UPDATE core_scheduled_jobs SET enabled = 0, last_run_at = ?, run_count = run_count + 1,
        updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run(now.toISOString(), schedule.id);
    } else {
      const next = computeNextRun(schedule, now);
      db.prepare(`
        UPDATE core_scheduled_jobs SET next_run_at = ?, last_run_at = ?, run_count = run_count + 1,
        updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run(next, now.toISOString(), schedule.id);
    }
  }
  return enqueued;
}

module.exports = {
  createSchedule,
  getSchedule,
  listSchedules,
  disableSchedule,
  tickScheduler,
  computeNextRun,
  SCHEDULE_TYPE,
};
