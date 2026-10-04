const { RISK } = require("./constants");
const { isAutonomousForbidden } = require("./permissions");

function requestApproval({ tool, reason, risk, conversationId, requestId, payload }) {
  const controlCenter = require("../controlCenter");
  const approval = controlCenter.createApproval({
    taskId: null,
    resourceType: "orchestrator_tool",
    resourceId: requestId || conversationId || tool,
    aiRecommendation: `Blocked pending human approval: ${tool}`,
    reason: reason || tool,
    riskLevel: risk || RISK.HIGH,
  });
  return {
    required: true,
    blocked: true,
    approvalId: approval?.id || approval,
    tool,
    risk,
    payload: payload || {},
  };
}

function mustApprove(toolName, risk) {
  if (isAutonomousForbidden(toolName)) return true;
  return risk === RISK.HIGH || risk === RISK.CRITICAL;
}

function decide({ approvalId, approved, actor }) {
  const controlCenter = require("../controlCenter");
  return controlCenter.decideApproval(approvalId, approved ? "approve" : "reject", actor);
}

module.exports = {
  requestApproval,
  mustApprove,
  decide,
};
