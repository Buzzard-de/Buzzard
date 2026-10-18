/**
 * Pusat worker — uses the existing jobQueue claim/lock/dead-letter path.
 */

const jobQueue = require("../jobQueue");
const { executeTask } = require("./lifecycle");
const { publicTaskError } = require("../security");

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
      const errorKey = publicTaskError(error, financial ? "FINANCIAL_NO_RETRY" : "CRASH");
      jobQueue.markDeadLetter(
        job.id,
        errorKey,
        financial ? "FINANCIAL_NO_RETRY" : error.failureKind || "CRASH"
      );
    } else {
      const errorKey = publicTaskError(error, error.failureKind || "CRASH");
      jobQueue.updateJob(job.id, {
        status: "RETRYING",
        error: errorKey,
        retryCount: retries,
        failureKind: error.failureKind || "CRASH",
      });
    }
    return {
      claimed: true,
      jobId: job.id,
      error: publicTaskError(error, "ai.worker.failed"),
      retried: !financial,
    };
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
