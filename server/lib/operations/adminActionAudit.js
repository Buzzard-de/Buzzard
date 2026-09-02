/**
 * Part 20 — Admin action audit helper (wraps Part 17 operationsAudit).
 */
const operationsAudit = require("./operationsAudit");
const { AUDIT_ACTIONS } = require("../../core/operationsConstants");
const { redactForLog } = require("../security");

function recordAdminAction(req, { action, resource, resourceId, result = "success", reason, metadata } = {}) {
  const actor = req.adminUser?.email || req.adminUser?.userId || "admin";
  return operationsAudit.recordAudit({
    actor,
    action,
    resource,
    resourceId,
    result,
    reason,
    correlationId: req.correlationId || req.operationsContext?.correlationId,
    requestId: req.requestId || req.operationsContext?.requestId,
    metadata: metadata ? redactForLog(metadata) : null,
  });
}

function recordBlockedAdminAction(req, { action, resource, resourceId, reason, metadata } = {}) {
  return recordAdminAction(req, {
    action: action || AUDIT_ACTIONS.SECURITY_GATE,
    resource,
    resourceId,
    result: "blocked",
    reason,
    metadata,
  });
}

module.exports = {
  recordAdminAction,
  recordBlockedAdminAction,
  AUDIT_ACTIONS,
};
