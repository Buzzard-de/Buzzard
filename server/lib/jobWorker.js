/**
 * Part 5 — Background worker with graceful shutdown, locking, retry policy.
 */
const crypto = require("crypto");
const { db } = require("./db");
const jobQueue = require("./jobQueue");
const { executeJob } = require("./jobHandlers");
const { appendJobLog } = require("./jobObservability");
const {
  JOB_STATUS,
  WORKER_STATE,
  DEFAULT_JOB_TIMEOUT_MS,
  DEFAULT_MAX_RETRIES,
  FAILURE_KIND,
} = require("../core/jobConstants");

const WORKER_ID = `worker_${crypto.randomBytes(4).toString("hex")}`;
let pollTimer = null;
let shuttingDown = false;
let currentJobId = null;

function getWorkerState() {
  const row = db.prepare("SELECT * FROM core_worker_state WHERE id = 'default'").get();
  if (!row) return { status: WORKER_STATE.STOPPED, workerId: null, jobsProcessed: 0 };
  return {
    status: row.status,
    workerId: row.worker_id,
    jobsProcessed: row.jobs_processed,
    lastTickAt: row.last_tick_at,
    startedAt: row.started_at,
    pausedAt: row.paused_at,
  };
}

function setWorkerState(partial) {
  const current = getWorkerState();
  db.prepare(`
    UPDATE core_worker_state SET
      status = ?,
      worker_id = ?,
      jobs_processed = ?,
      last_tick_at = ?,
      paused_at = ?,
      started_at = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = 'default'
  `).run(
    partial.status ?? current.status,
    partial.workerId ?? current.workerId,
    partial.jobsProcessed ?? current.jobsProcessed,
    partial.lastTickAt ?? current.lastTickAt ?? null,
    partial.pausedAt ?? current.pausedAt ?? null,
    partial.startedAt ?? current.startedAt ?? null
  );
}

function classifyError(err) {
  if (err.failureKind) return err.failureKind;
  const msg = String(err.message || "").toLowerCase();
  if (msg.includes("timeout") || err.name === "AbortError") return FAILURE_KIND.TIMEOUT;
  if (msg.includes("network") || msg.includes("fetch")) return FAILURE_KIND.NETWORK;
  if (msg.includes("sql") || msg.includes("database")) return FAILURE_KIND.DATABASE;
  if (msg.includes("provider") || msg.includes("supplier")) return FAILURE_KIND.PROVIDER;
  return FAILURE_KIND.UNKNOWN;
}

function computeRetryDelay(retryCount) {
  return Math.min(60_000, 1000 * 2 ** retryCount);
}

async function runJobWithTimeout(job, timeoutMs) {
  return Promise.race([
    executeJob(job),
    new Promise((_, reject) => {
      setTimeout(() => {
        const err = new Error(`Job timeout after ${timeoutMs}ms`);
        err.failureKind = FAILURE_KIND.TIMEOUT;
        reject(err);
      }, timeoutMs);
    }),
  ]);
}

async function processOneJob() {
  if (shuttingDown) return false;
  const state = getWorkerState();
  if (state.status === WORKER_STATE.PAUSED) return false;

  const job = jobQueue.claimNextJob(WORKER_ID);
  if (!job) return false;

  currentJobId = job.id;
  const started = Date.now();
  appendJobLog(job.id, `Claimed by ${WORKER_ID}`, { level: "INFO" });

  try {
    const result = await runJobWithTimeout(job, DEFAULT_JOB_TIMEOUT_MS);
    const executionMs = Date.now() - started;
    jobQueue.updateJob(job.id, {
      status: JOB_STATUS.COMPLETED,
      result,
      executionMs,
      workerId: WORKER_ID,
    });
    setWorkerState({
      jobsProcessed: getWorkerState().jobsProcessed + 1,
      lastTickAt: new Date().toISOString(),
    });
  } catch (err) {
    const executionMs = Date.now() - started;
    const failureKind = classifyError(err);
    const retry = (job.retryCount || 0) + 1;
    const maxRetries = job.maxRetries ?? DEFAULT_MAX_RETRIES;

    appendJobLog(job.id, err.message, { level: "ERROR", metadata: { failureKind, retry } });

    if (retry < maxRetries) {
      const delayMs = computeRetryDelay(retry);
      const nextRun = new Date(Date.now() + delayMs).toISOString();
      db.prepare(`
        UPDATE core_background_jobs SET
          status = 'RETRYING', retry_count = ?, error_message = ?, failure_kind = ?,
          execution_ms = ?, next_run_at = ?, lock_owner = NULL, lock_expires_at = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(retry, err.message, failureKind, executionMs, nextRun, job.id);
    } else {
      jobQueue.markDeadLetter(job.id, err.message, failureKind);
      jobQueue.updateJob(job.id, { executionMs });
    }
  } finally {
    currentJobId = null;
  }
  return true;
}

async function tick() {
  jobQueue.releaseStaleLocks();
  setWorkerState({ lastTickAt: new Date().toISOString() });
  let processed = 0;
  while (!shuttingDown && getWorkerState().status === WORKER_STATE.RUNNING && processed < 3) {
    const did = await processOneJob();
    if (!did) break;
    processed += 1;
  }
}

function startWorker({ pollIntervalMs = 3000 } = {}) {
  if (pollTimer) return getWorkerState();
  shuttingDown = false;
  setWorkerState({
    status: WORKER_STATE.RUNNING,
    workerId: WORKER_ID,
    startedAt: new Date().toISOString(),
    pausedAt: null,
  });
  jobQueue.releaseStaleLocks();
  pollTimer = setInterval(() => {
    tick().catch((err) => console.error("[worker] tick error:", err.message));
  }, pollIntervalMs);
  if (pollTimer.unref) pollTimer.unref();
  tick().catch(() => {});
  console.log(`[worker] started ${WORKER_ID}`);
  return getWorkerState();
}

function pauseWorker() {
  setWorkerState({ status: WORKER_STATE.PAUSED, pausedAt: new Date().toISOString() });
  return getWorkerState();
}

function resumeWorker() {
  setWorkerState({ status: WORKER_STATE.RUNNING, pausedAt: null });
  return getWorkerState();
}

function stopWorker() {
  shuttingDown = true;
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  setWorkerState({ status: WORKER_STATE.STOPPED, workerId: null });
  if (currentJobId) {
    appendJobLog(currentJobId, "Worker shutdown during execution", { level: "WARN" });
  }
  console.log("[worker] stopped");
  return getWorkerState();
}

function setupGracefulShutdown() {
  const shutdown = () => {
    stopWorker();
    process.exit(0);
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

module.exports = {
  WORKER_ID,
  getWorkerState,
  startWorker,
  pauseWorker,
  resumeWorker,
  stopWorker,
  processOneJob,
  tick,
  setupGracefulShutdown,
};
