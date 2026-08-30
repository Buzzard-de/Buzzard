/**
 * Part 19 — Customer action audit (wraps Part 17 operationsAudit).
 */
const operationsAudit = require("../operations/operationsAudit");
const { CUSTOMER_AUDIT_ACTIONS } = require("../../core/customerExperienceConstants");

function recordCustomerAction(req, { action, resource, resourceId, result = "success", reason, metadata } = {}) {
  const session = req.customerSession;
  const actor = session?.email || session?.customerId || "anonymous";
  return operationsAudit.recordAudit({
    actor,
    action,
    resource,
    resourceId,
    result,
    reason,
    correlationId: req.correlationId || req.operationsContext?.correlationId,
    requestId: req.requestId || req.operationsContext?.requestId,
    metadata: { ...metadata, authSource: session?.authSource },
  });
}

module.exports = {
  CUSTOMER_AUDIT_ACTIONS,
  recordCustomerAction,
};
