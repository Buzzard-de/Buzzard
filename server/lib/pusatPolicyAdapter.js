/**
 * Phase B — Maps Pusat runtime policy/actions onto Buzzard control center, RBAC, and read-only services.
 * No parallel approval DB; no production side effects in this phase.
 */

const controlCenter = require("./controlCenter");
const { aiCanExecute } = require("./rbac");
const phoneAssistantService = require("./phoneAssistantService");
const { RISK_LEVEL } = require("../core/constants");

/** Aligned with pusat-ai-runtime/src/policy.ts APPROVAL_ACTIONS */
const APPROVAL_CLASS_ACTIONS = new Set([
  "REFUND_HIGH_VALUE",
  "CANCEL_HIGH_VALUE_ORDER",
  "SUPPLIER_PURCHASE",
  "MARKETPLACE_ORDER",
  "REAL_PAYMENT_CAPTURE",
]);

/** Phase B: only these may reach Pusat orchestrator dispatch */
const READ_ONLY_ACTIONS = new Set([
  "GET_ORDER",
  "CHECK_AVAILABILITY",
  "GET_PRODUCT",
  "CHECK_VARIANT",
  "IDENTIFY_CUSTOMER",
  "CHECK_RETURN_POLICY",
  "CHECK_PRICE",
  "CHECK_SUPPLIER",
]);

/** Blocked write/side-effect agent actions (never execute in Phase B) */
const WRITE_SIDE_EFFECT_ACTIONS = new Set([
  "CHANGE_ORDER",
  "CANCEL_ORDER",
  "CREATE_RETURN",
  "CREATE_EXCHANGE",
  "REQUEST_SUPPLIER_ACTION",
  ...APPROVAL_CLASS_ACTIONS,
]);

function isReadOnlyAction(action) {
  return READ_ONLY_ACTIONS.has(String(action || ""));
}

function isWriteOrSideEffectAction(action) {
  return WRITE_SIDE_EFFECT_ACTIONS.has(String(action || ""));
}

function requiresBuzzardApprovalRecord(action) {
  return APPROVAL_CLASS_ACTIONS.has(String(action || ""));
}

/**
 * Pusat PolicyEngine scopes — derived from Buzzard admin/AI permissions (no new permission model).
 */
function buildAuthorizationScopes(action, permissions = []) {
  const normalized = Array.isArray(permissions) ? permissions : [];
  const scopes = [];
  if (aiCanExecute(normalized, "ai.execute") || aiCanExecute(normalized, "*")) {
    scopes.push("*");
  }
  if (isReadOnlyAction(action) && aiCanExecute(normalized, "ai.read")) {
    scopes.push(`action:${action}`);
  }
  if (requiresBuzzardApprovalRecord(action) && aiCanExecute(normalized, "system.configure")) {
    scopes.push("critical:approval");
  }
  return [...new Set(scopes)];
}

function mirrorAuditEvent({ correlationId, actor, action, outcome, metadata }) {
  controlCenter.recordSystemEvent({
    eventType: "pusat.audit",
    actorType: "pusat_runtime",
    actorId: actor || "pusat-bridge",
    resourceType: "pusat_action",
    resourceId: action || "unknown",
    summary: `Pusat ${action || "action"}: ${outcome || "UNKNOWN"}`,
    metadata: {
      correlationId: correlationId || null,
      phase: "B",
      readOnlyBridge: true,
      ...(metadata || {}),
    },
  });
}

function mapHumanApprovalToControlCenter({ correlationId, action, reason, sessionId, payload }) {
  const approval = controlCenter.createApproval({
    taskId: null,
    resourceType: "pusat_runtime",
    resourceId: correlationId || "unknown",
    aiRecommendation:
      `Pusat runtime blocked action "${action}" pending human approval. ` +
      `Session: ${sessionId || "n/a"}. No automatic side effects.`,
    reason: reason || `Pusat policy: ${action}`,
    riskLevel: RISK_LEVEL.HIGH,
  });

  mirrorAuditEvent({
    correlationId,
    actor: "pusat-policy-adapter",
    action,
    outcome: "HUMAN_APPROVAL_REQUIRED",
    metadata: { approvalId: approval?.id, sessionId, payloadKeys: payload ? Object.keys(payload) : [] },
  });

  return approval;
}

/**
 * Read-only Buzzard domain lookups (existing services only).
 */
async function executeReadOnlyBuzzardAction(action, payload) {
  if (action === "GET_ORDER") {
    const body = payload && typeof payload === "object" ? payload : {};
    return phoneAssistantService.getVerifiedOrderStatus({
      orderNumber: body.orderNumber,
      email: body.email,
      postalCode: body.postalCode,
      locale: body.locale || "de",
    });
  }
  return null;
}

module.exports = {
  APPROVAL_CLASS_ACTIONS,
  READ_ONLY_ACTIONS,
  WRITE_SIDE_EFFECT_ACTIONS,
  isReadOnlyAction,
  isWriteOrSideEffectAction,
  requiresBuzzardApprovalRecord,
  buildAuthorizationScopes,
  mirrorAuditEvent,
  mapHumanApprovalToControlCenter,
  executeReadOnlyBuzzardAction,
};
