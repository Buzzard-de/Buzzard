/**
 * Part 26 — Final production hardening audit wrapper (Part 17 operationsAudit).
 */
const operationsAudit = require("../operations/operationsAudit");
const { listAudit } = operationsAudit;
const { AUDIT_ACTIONS } = require("../../core/operationsConstants");
const { redactSecrets } = require("../supplier/realSupplierConnector");

function recordFinalHardeningAction(req, {
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
    resource: "final-hardening",
    resourceId: "readiness",
    result,
    reason: blockedReason,
    metadata: safeMeta,
  });
}

function listRecentFinalHardeningAudit(limit = 25) {
  return listAudit({ resource: "final-hardening", limit }).map((row) => ({
    ...row,
    metadata: row.metadata ? redactSecrets(row.metadata) : null,
  }));
}

module.exports = {
  recordFinalHardeningAction,
  listRecentFinalHardeningAudit,
};
