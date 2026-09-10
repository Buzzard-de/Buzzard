/**
 * Server-side Returns Engine mirror — financial fields are server-controlled.
 */
const SERVER_ONLY_FIELDS = new Set([
  "supplierRecovery",
  "supplierCreditAmount",
  "supplierRefundAmount",
  "customerRefundAmount",
  "buzzardImpact",
  "buzzardLoss",
  "buzzardRecovery",
  "returnStatus",
  "status",
  "supplierReturnStatus",
  "disputeStatus",
  "reconciliation",
  "financialReconciliation",
]);

const SECRET_PATTERN = /api[_-]?key|secret|password|token|authorization|bearer|credential|cvv|card/i;

function rejectClientReturnModification(body = {}) {
  for (const key of Object.keys(body)) {
    if (SECRET_PATTERN.test(key)) {
      return { allowed: false, reason: "CREDENTIALS_NOT_ALLOWED_ON_CLIENT" };
    }
    if (SERVER_ONLY_FIELDS.has(key)) {
      return { allowed: false, reason: "RETURN_FIELDS_NOT_CLIENT_WRITABLE" };
    }
  }
  return { allowed: true };
}

function canCustomerAccessReturn(returnCustomerId, requestCustomerId) {
  return returnCustomerId === requestCustomerId;
}

function sanitizeClientReturnPatch(existing = {}, patch = {}) {
  const sanitized = { ...existing };
  for (const key of Object.keys(patch)) {
    if (!SERVER_ONLY_FIELDS.has(key)) {
      sanitized[key] = patch[key];
    }
  }
  return sanitized;
}

module.exports = {
  rejectClientReturnModification,
  canCustomerAccessReturn,
  sanitizeClientReturnPatch,
};
