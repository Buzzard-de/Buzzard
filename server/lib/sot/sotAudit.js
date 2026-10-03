"use strict";

function createSotAudit(options = {}) {
  const logAudit = options.logAudit || require("../coreAudit").logAudit;

  function record({
    result,
    entity,
    entityId = null,
    actor = null,
    source = null,
    operation = null,
    reason = null,
    version = null,
    expectedVersion = null,
    correlationId = null,
  }) {
    const action =
      result === "accepted"
        ? "SOT_WRITE_ACCEPTED"
        : result === "conflict"
          ? "SOT_CONFLICT_DETECTED"
          : "SOT_WRITE_REJECTED";
    logAudit({
      action,
      entityType: entity,
      entityId,
      result: result === "accepted" ? "success" : "failure",
      metadata: {
        entity,
        entityId,
        actor,
        source,
        operation,
        result,
        reason,
        version,
        expectedVersion,
        correlationId,
      },
    });
    return action;
  }

  return Object.freeze({ record });
}

module.exports = { createSotAudit };
