export interface PolicyDecision {
  allowed: boolean;
  requiresApproval: boolean;
  reason: string;
}

const APPROVAL_ACTIONS = new Set([
  "REFUND_HIGH_VALUE",
  "CANCEL_HIGH_VALUE_ORDER",
  "SUPPLIER_PURCHASE",
  "MARKETPLACE_ORDER",
  "REAL_PAYMENT_CAPTURE"
]);

export class PolicyEngine {
  evaluate(action: string, scopes: string[]): PolicyDecision {
    if (APPROVAL_ACTIONS.has(action)) {
      return {
        allowed: scopes.includes("critical:approval"),
        requiresApproval: true,
        reason: "Critical side effect requires explicit approval."
      };
    }
    return {
      allowed: scopes.includes("*") || scopes.includes(`action:${action}`),
      requiresApproval: false,
      reason: "Standard policy evaluation."
    };
  }
}