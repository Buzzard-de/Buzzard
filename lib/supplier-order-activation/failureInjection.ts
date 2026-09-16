export type ActivationFailureInjection =
  | "NONE"
  | "MISSING_CREDENTIALS"
  | "INVALID_CREDENTIALS"
  | "ENVIRONMENT_MISMATCH"
  | "CREATEORDER_UNVERIFIED"
  | "READINESS_BLOCKED"
  | "EXPIRED_APPROVAL"
  | "SELF_APPROVAL"
  | "SCOPE_MISMATCH"
  | "STALE_INVENTORY"
  | "RESERVATION_MISMATCH"
  | "PRICE_SNAPSHOT_MISMATCH"
  | "SUPPLIER_DISABLED"
  | "MARKET_DISABLED"
  | "CHANNEL_DISABLED"
  | "KILL_SWITCH_ON"
  | "RISK_EXCEEDED"
  | "ORDER_LIMIT_EXCEEDED"
  | "PAYLOAD_HASH_CHANGED"
  | "DUPLICATE_IDEMPOTENCY"
  | "EXPIRED_REHEARSAL"
  | "CRITICAL_FCT_INCIDENT"
  | "SECURITY_VIOLATION"
  | "NETWORK_DISABLED"
  | "AI_BOUNDARY";

export function resolveActivationFailureInjection(
  type: ActivationFailureInjection,
): { blockerCode: string; stage: string } | null {
  const map: Record<ActivationFailureInjection, { blockerCode: string; stage: string } | null> = {
    NONE: null,
    MISSING_CREDENTIALS: { blockerCode: "CREDENTIAL_NOT_CONFIGURED", stage: "CREDENTIAL" },
    INVALID_CREDENTIALS: { blockerCode: "CREDENTIAL_INVALID", stage: "CREDENTIAL" },
    ENVIRONMENT_MISMATCH: { blockerCode: "ENVIRONMENT_MISMATCH", stage: "ENVIRONMENT" },
    CREATEORDER_UNVERIFIED: { blockerCode: "REAL_ORDER_ENDPOINT_NOT_VALIDATED", stage: "CAPABILITY" },
    READINESS_BLOCKED: { blockerCode: "READINESS_NOT_READY", stage: "READINESS" },
    EXPIRED_APPROVAL: { blockerCode: "APPROVAL_EXPIRED", stage: "APPROVAL" },
    SELF_APPROVAL: { blockerCode: "SELF_APPROVAL_FORBIDDEN", stage: "APPROVAL" },
    SCOPE_MISMATCH: { blockerCode: "APPROVAL_SCOPE_MISMATCH", stage: "APPROVAL" },
    STALE_INVENTORY: { blockerCode: "INVENTORY_STALE", stage: "INVENTORY" },
    RESERVATION_MISMATCH: { blockerCode: "RESERVATION_MISMATCH", stage: "INVENTORY" },
    PRICE_SNAPSHOT_MISMATCH: { blockerCode: "PRICE_SNAPSHOT_MISMATCH", stage: "PRICING" },
    SUPPLIER_DISABLED: { blockerCode: "SUPPLIER_DISABLED", stage: "SUPPLIER" },
    MARKET_DISABLED: { blockerCode: "MARKET_UNSUPPORTED", stage: "MARKET" },
    CHANNEL_DISABLED: { blockerCode: "CHANNEL_UNSUPPORTED", stage: "CHANNEL" },
    KILL_SWITCH_ON: { blockerCode: "KILL_SWITCH_ACTIVE", stage: "KILL_SWITCH" },
    RISK_EXCEEDED: { blockerCode: "RISK_CRITICAL", stage: "RISK" },
    ORDER_LIMIT_EXCEEDED: { blockerCode: "MAX_ORDER_VALUE_EXCEEDED", stage: "LIMITS" },
    PAYLOAD_HASH_CHANGED: { blockerCode: "PAYLOAD_HASH_CHANGED", stage: "PAYLOAD" },
    DUPLICATE_IDEMPOTENCY: { blockerCode: "DUPLICATE_IDEMPOTENCY", stage: "IDEMPOTENCY" },
    EXPIRED_REHEARSAL: { blockerCode: "REHEARSAL_EXPIRED", stage: "REHEARSAL" },
    CRITICAL_FCT_INCIDENT: { blockerCode: "CRITICAL_INCIDENTS", stage: "FCT" },
    SECURITY_VIOLATION: { blockerCode: "SECURITY_VIOLATION", stage: "SECURITY" },
    NETWORK_DISABLED: { blockerCode: "NETWORK_DISABLED", stage: "NETWORK" },
    AI_BOUNDARY: { blockerCode: "AI_BOUNDARY", stage: "AI" },
  };
  return map[type] ?? null;
}
