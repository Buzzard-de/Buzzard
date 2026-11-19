/**
 * Supplier pipeline error recovery (exponential backoff, human gate on live).
 */
const { SUPPLIER_ERROR_CODE } = require("../../core/supplierIntegrationConstants");

const RETRYABLE = new Set([
  SUPPLIER_ERROR_CODE.NETWORK_BLOCKED,
  SUPPLIER_ERROR_CODE.TIMEOUT,
  SUPPLIER_ERROR_CODE.RATE_LIMITED,
  "networkBlocked",
  "TIMEOUT",
]);

function planSupplierRecovery(error = {}, { attempt = 1, maxAttempts = 3 } = {}) {
  const code = error.code || error.errorCode || "UNKNOWN";
  if (!RETRYABLE.has(code)) {
    return {
      ok: false,
      retry: false,
      code,
      live: false,
      escalate: "HUMAN_REVIEW",
    };
  }
  if (attempt >= maxAttempts) {
    return {
      ok: false,
      retry: false,
      code: "MAX_ATTEMPTS",
      attempts: attempt,
      live: false,
      escalate: "HUMAN_REVIEW",
    };
  }
  const backoffMs = Math.min(60_000, 500 * 2 ** (attempt - 1));
  return {
    ok: true,
    retry: true,
    attempt: attempt + 1,
    backoffMs,
    live: false,
    dryRunOnly: true,
  };
}

module.exports = { planSupplierRecovery, RETRYABLE };