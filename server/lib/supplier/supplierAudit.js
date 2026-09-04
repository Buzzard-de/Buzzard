/**
 * Part 23 — Supplier audit wrapper (Part 17 operationsAudit, no secrets).
 */
const operationsAudit = require("../operations/operationsAudit");
const { AUDIT_ACTIONS } = require("../../core/operationsConstants");
const { redactSecrets } = require("./realSupplierConnector");

function recordSupplierAction(req, {
  supplierId,
  action,
  result = "success",
  dryRun = true,
  blockedReason = null,
  correlationId = null,
  metadata = null,
} = {}) {
  const safeMeta = redactSecrets({
    supplier: supplierId,
    dryRun,
    blockedReason,
    ...(metadata || {}),
  });

  return operationsAudit.recordFromRequest(req, {
    action: action || AUDIT_ACTIONS.PRODUCT_IMPORT,
    resource: "supplier",
    resourceId: supplierId,
    result,
    reason: blockedReason,
    metadata: safeMeta,
    correlationId,
  });
}

function recordSupplierSystemAction({
  supplierId,
  action,
  result = "success",
  dryRun = true,
  blockedReason = null,
  correlationId = null,
  metadata = null,
} = {}) {
  const safeMeta = redactSecrets({
    supplier: supplierId,
    dryRun,
    blockedReason,
    ...(metadata || {}),
  });

  return operationsAudit.recordAudit({
    actor: "system",
    action: action || AUDIT_ACTIONS.PRODUCT_IMPORT,
    resource: "supplier",
    resourceId: supplierId,
    result,
    reason: blockedReason,
    correlationId,
    metadata: safeMeta,
  });
}

module.exports = {
  recordSupplierAction,
  recordSupplierSystemAction,
};
