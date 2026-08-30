/**
 * Part 17 — Central operations control plane.
 */
const jobQueue = require("../jobQueue");
const { mapJobStatus, OPERATIONS_STATUS } = require("../../core/operationsConstants");
const jobSafetyGate = require("../jobSafetyGate");
const { getJobSafetyStatus } = require("../jobSafetyGate");

function normalizeJob(job) {
  if (!job) return null;
  const opsStatus = mapJobStatus(job.status);
  return {
    jobId: job.id,
    operation: job.jobType,
    status: opsStatus,
    rawStatus: job.status,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    finishedAt: job.completedAt,
    error: job.error || null,
    attempts: job.retryCount ?? 0,
    maxAttempts: job.maxRetries ?? 3,
    workerId: job.workerId || null,
    executionMs: job.executionMs || null,
    failureKind: job.failureKind || null,
  };
}

function getJobStatus(jobId) {
  const job = jobQueue.getJob(jobId);
  return normalizeJob(job);
}

function listOperations({ status, jobType, limit = 50 } = {}) {
  const jobs = jobQueue.listJobs({ status, jobType, limit });
  return jobs.map(normalizeJob);
}

function getOperationsSummary() {
  const counts = jobQueue.countJobsByStatus();
  const summary = {};
  for (const [raw, count] of Object.entries(counts)) {
    const ops = mapJobStatus(raw);
    summary[ops] = (summary[ops] || 0) + count;
  }
  return {
    jobs: summary,
    total: Object.values(counts).reduce((a, b) => a + b, 0),
    jobSafety: getJobSafetyStatus(),
    statuses: Object.values(OPERATIONS_STATUS),
  };
}

function assertJobCanRun(job) {
  const safety = jobSafetyGate.assertJobSafe(job);
  if (!safety.ok) {
    return {
      ok: false,
      status: OPERATIONS_STATUS.BLOCKED,
      issues: safety.issues,
    };
  }
  return { ok: true, status: OPERATIONS_STATUS.PENDING };
}

module.exports = {
  normalizeJob,
  getJobStatus,
  listOperations,
  getOperationsSummary,
  assertJobCanRun,
};
