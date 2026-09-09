/**
 * Automotive Production Integration — returns manager.
 */
const { recordIntegrationAudit } = require("./integrationAudit");

const RETURN_FLOW = Object.freeze([
  "CUSTOMER_REQUEST", "REVIEW", "APPROVED", "SUPPLIER_RETURN",
  "RECEIVED", "REFUND_PENDING", "REFUNDED",
]);

function createReturnRequest(input = {}) {
  const request = {
    returnId: input.returnId || `RET-${Date.now()}`,
    orderId: input.orderId,
    sku: input.sku,
    state: "CUSTOMER_REQUEST",
    automotive: {
      reason: input.reason || "unknown",
      vehicle: input.vehicle || null,
      part: input.part || input.sku,
      fitment: input.fitment || null,
      installationStatus: input.installationStatus || "unknown",
      openedPackage: Boolean(input.openedPackage),
      damage: Boolean(input.damage),
      supplierReturnPolicy: input.supplierReturnPolicy || "standard",
    },
    aiRecommendation: input.aiRecommendation || {
      approve: false,
      confidence: 0.5,
      requiresHumanReview: true,
    },
    humanApprovalRequired: true,
    approved: false,
    refunded: false,
  };

  recordIntegrationAudit({
    action: "RETURN_CREATED",
    entityId: request.returnId,
    metadata: { orderId: request.orderId, sku: request.sku, reason: request.automotive.reason },
  });

  return request;
}

function transitionReturn(returnRequest = {}, targetState) {
  if (!RETURN_FLOW.includes(targetState)) {
    return { ok: false, error: "invalid_return_state" };
  }
  if (targetState === "APPROVED" && !returnRequest.humanApproved) {
    return { ok: false, error: "HUMAN_APPROVAL_REQUIRED", state: returnRequest.state };
  }
  return { ok: true, returnId: returnRequest.returnId, state: targetState };
}

function approveReturn(returnRequest = {}, actor = "admin") {
  recordIntegrationAudit({
    action: "RETURN_CREATED",
    entityId: returnRequest.returnId,
    actor,
    metadata: { approved: true },
  });
  return { ...returnRequest, state: "APPROVED", humanApproved: true, approved: true };
}

module.exports = {
  RETURN_FLOW,
  createReturnRequest,
  transitionReturn,
  approveReturn,
};
