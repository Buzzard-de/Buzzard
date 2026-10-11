/**
 * Pusat worker — uses the existing jobQueue claim/lock/dead-letter path.
 */

const jobQueue = require("../jobQueue");
const { executeTask } = require("./lifecycle");

async function claimAndExecute(workerId = "pusat-worker", { jobType = "AI_TASK", lockTtlMs } = {}) {
  const job = jobQueue.claimNextJob(workerId, lockTtlMs, { jobType });
  if (!job) {
    return { claimed: false };
  }

  try {
    let result = null;
    if (job.jobType === "AI_TASK" && job.payload?.taskId) {
      result = await executeTask(job.payload.taskId);
    }
    jobQueue.updateJob(job.id, { status: "COMPLETED", result: result || { ok: true } });
    return { claimed: true, jobId: job.id, result };
  } catch (error) {
    const retries = (job.retryCount || 0) + 1;
    const financial = jobQueue.isFinancialJobType(job.jobType);
    if (financial || retries >= (job.maxRetries || 3)) {
      jobQueue.markDeadLetter(
        job.id,
        financial ? `financial_no_retry: ${error.message}` : error.message,
        financial ? "FINANCIAL_NO_RETRY" : error.failureKind || "CRASH"
      );
    } else {
      jobQueue.updateJob(job.id, {
        status: "RETRYING",
        error: error.message,
        retryCount: retries,
        failureKind: error.failureKind || "CRASH",
      });
    }
    return { claimed: true, jobId: job.id, error: error.message, retried: !financial };
  }
}

function recoverAbandoned() {
  return { recovered: jobQueue.releaseStaleLocks() };
}

function enqueueTaskJob(taskId, options = {}) {
  const { enqueueAiTaskAsJob } = require("../aiJobBridge");
  return enqueueAiTaskAsJob(taskId, options);
}

function health() {
  return {
    ok: true,
    jobs: jobQueue.countJobsByStatus(),
  };
}

module.exports = {
  claimAndExecute,
  recoverAbandoned,
  enqueueTaskJob,
  health,
};
