/**
 * Server-side AI Workers mirror — execution fields are server-controlled.
 */
const SERVER_ONLY_FIELDS = new Set([
  "validationStatus",
  "deterministicValidation",
  "recommendation",
  "confidence",
  "authorityRequired",
  "status",
]);

const SECRET_PATTERN = /api[_-]?key|secret|password|token|authorization|bearer|credential|cvv|card/i;

function rejectClientExecutionModification(body = {}) {
  for (const key of Object.keys(body)) {
    if (SECRET_PATTERN.test(key)) {
      return { allowed: false, reason: "CREDENTIALS_NOT_ALLOWED" };
    }
    if (SERVER_ONLY_FIELDS.has(key)) {
      return { allowed: false, reason: "EXECUTION_FIELDS_NOT_CLIENT_WRITABLE" };
    }
  }
  return { allowed: true };
}

function validateWorkerIdentity(requestedWorkerId, actualWorkerId) {
  return requestedWorkerId === actualWorkerId;
}

module.exports = {
  rejectClientExecutionModification,
  validateWorkerIdentity,
};
