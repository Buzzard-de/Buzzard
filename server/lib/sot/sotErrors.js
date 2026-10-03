"use strict";

function sotError(code, message, metadata = {}, statusCode = 409) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  error.metadata = metadata;
  return error;
}

function writeAuthorityViolation({ entity, actor, owner, operation, correlationId }) {
  return sotError(
    "SOT_WRITE_AUTHORITY_VIOLATION",
    `Actor ${actor} cannot write ${entity}; owner is ${owner}`,
    { entity, actor, owner, operation, correlationId },
    403
  );
}

function versionConflict({ entity, entityId, expectedVersion, actualVersion, correlationId }) {
  return sotError(
    "SOT_VERSION_CONFLICT",
    `Version mismatch for ${entity}`,
    { entity, entityId, expectedVersion, actualVersion, correlationId },
    409
  );
}

function writeBlocked({ entity, reason, correlationId }) {
  return sotError(
    "SOT_WRITE_BLOCKED",
    `${entity} write blocked: ${reason}`,
    { entity, reason, correlationId },
    423
  );
}

module.exports = {
  sotError,
  writeAuthorityViolation,
  versionConflict,
  writeBlocked,
};
