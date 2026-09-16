export function resolveFirstOrderFailureInjection(code?: string): string | undefined {
  if (!code) return undefined;
  const allowed = [
    "missing_evidence",
    "create_order_unverified",
    "validation_expired",
    "readiness_blocked",
    "arming_blocked",
    "approval_missing",
    "self_approval",
    "approval_expired",
    "scope_mismatch",
    "limit_exceeded",
    "price_changed",
    "inventory_missing",
    "supplier_changed",
    "payload_hash_changed",
    "kill_switch",
    "network_off",
    "authorization_expired",
    "authorization_replay",
    "supplier_timeout",
    "supplier_5xx",
    "supplier_429",
    "supplier_rejection",
    "unknown_outcome",
  ];
  return allowed.includes(code) ? code : undefined;
}
