export function resolveGoLiveFailureInjection(code?: string): string | undefined {
  if (!code) return undefined;
  const allowed = [
    "missing_first_order",
    "unknown_outcome",
    "supplier_confirmation_failed",
    "fct_mismatch",
    "inventory_mismatch",
    "financial_mismatch",
    "kill_switch",
    "approval_missing",
    "self_approval",
    "expired_approval",
    "scope_mismatch",
  ];
  return allowed.includes(code) ? code : undefined;
}
