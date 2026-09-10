/**
 * Server-side AI Orchestrator mirror — privileged fields are server-controlled.
 */
const SERVER_ONLY_FIELDS = new Set([
  "status",
  "authorityLevel",
  "deterministicValidation",
  "result",
  "recommendation",
  "escalationState",
  "retryCount",
  "failureReason",
  "failureType",
]);

const SECRET_PATTERN = /api[_-]?key|secret|password|token|authorization|bearer|credential|cvv|card/i;

function rejectClientTaskModification(body = {}) {
  for (const key of Object.keys(body)) {
    if (SECRET_PATTERN.test(key)) {
      return { allowed: false, reason: "CREDENTIALS_NOT_ALLOWED_ON_CLIENT" };
    }
    if (SERVER_ONLY_FIELDS.has(key)) {
      return { allowed: false, reason: "TASK_FIELDS_NOT_CLIENT_WRITABLE" };
    }
  }
  return { allowed: true };
}

function canCustomerAccessTask(taskCustomerId, requestCustomerId) {
  if (!taskCustomerId) return false;
  return taskCustomerId === requestCustomerId;
}

function sanitizeClientTaskPatch(existing = {}, patch = {}) {
  const sanitized = { ...existing };
  for (const key of Object.keys(patch)) {
    if (!SERVER_ONLY_FIELDS.has(key) && !SECRET_PATTERN.test(key)) {
      sanitized[key] = patch[key];
    }
  }
  return sanitized;
}

module.exports = {
  rejectClientTaskModification,
  canCustomerAccessTask,
  sanitizeClientTaskPatch,
};
