/**
 * Part 17 — Job retry and failure management policy.
 */
const { JOB_STATUS, DEFAULT_MAX_RETRIES, FAILURE_KIND } = require("../../core/jobConstants");
const { OPERATIONS_STATUS } = require("../../core/operationsConstants");

const RETRYABLE_KINDS = new Set([
  FAILURE_KIND.TIMEOUT,
  FAILURE_KIND.NETWORK,
  FAILURE_KIND.CRASH,
  FAILURE_KIND.UNKNOWN,
]);

function computeBackoffMs(retryCount, { baseMs = 1000, maxMs = 60_000 } = {}) {
  return Math.min(maxMs, baseMs * 2 ** Math.max(0, retryCount));
}

function shouldRetry({ retryCount, maxRetries, failureKind }) {
  if (retryCount >= maxRetries) return false;
  if (failureKind && !RETRYABLE_KINDS.has(failureKind)) return false;
  return true;
}

function resolveFailureStatus({ retryCount, maxRetries, failureKind }) {
  if (shouldRetry({ retryCount, maxRetries, failureKind })) {
    return {
      jobStatus: JOB_STATUS.RETRYING,
      opsStatus: OPERATIONS_STATUS.RETRYING,
      retry: true,
      delayMs: computeBackoffMs(retryCount),
    };
  }
  if (retryCount >= maxRetries) {
    return {
      jobStatus: JOB_STATUS.DEAD_LETTER,
      opsStatus: OPERATIONS_STATUS.PERMANENTLY_FAILED,
      retry: false,
      permanent: true,
    };
  }
  return {
    jobStatus: JOB_STATUS.FAILED,
    opsStatus: OPERATIONS_STATUS.FAILED,
    retry: false,
    permanent: false,
  };
}

function getRetryPolicy() {
  return {
    defaultMaxRetries: DEFAULT_MAX_RETRIES,
    retryableKinds: [...RETRYABLE_KINDS],
    backoff: { baseMs: 1000, maxMs: 60_000, exponential: true },
    deadLetterStatus: JOB_STATUS.DEAD_LETTER,
    permanentlyFailed: OPERATIONS_STATUS.PERMANENTLY_FAILED,
    failClosed: true,
  };
}

module.exports = {
  computeBackoffMs,
  shouldRetry,
  resolveFailureStatus,
  getRetryPolicy,
  RETRYABLE_KINDS,
};
