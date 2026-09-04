/**
 * Part 25 — Release audit wrapper (Part 17 operationsAudit, no secrets).
 */
const operationsAudit = require("../operations/operationsAudit");
const { AUDIT_ACTIONS } = require("../../core/operationsConstants");
const { redactSecrets } = require("../supplier/realSupplierConnector");

function recordReleaseAction(req, {
  action,
  result = "success",
  dryRun = true,
  blockedReason = null,
  metadata = null,
} = {}) {
  const safeMeta = redactSecrets({
    dryRun,
    blockedReason,
    ...(metadata || {}),
  });

  return operationsAudit.recordFromRequest(req, {
    action: action || AUDIT_ACTIONS.ADMIN_CHANGE,
    resource: "release",
    resourceId: "readiness",
    result,
    reason: blockedReason,
    metadata: safeMeta,
  });
}

module.exports = {
  recordReleaseAction,
};
