export type ArmingFailureInjection =
  | "NONE"
  | "CREDENTIALS_MISSING"
  | "CREATE_ORDER_UNVERIFIED"
  | "VALIDATION_EXPIRED"
  | "EVIDENCE_MISSING"
  | "APPROVAL_MISSING"
  | "APPROVAL_EXPIRED"
  | "SCOPE_MISMATCH"
  | "LIMIT_MISMATCH"
  | "KILL_SWITCH"
  | "READINESS_BLOCKED"
  | "CONCURRENCY";

export function resolveArmingFailureInjection(type: ArmingFailureInjection): {
  blockerCode: string;
  injectBlockers: string[];
} | null {
  if (type === "NONE") return null;
  const map: Record<string, string[]> = {
    CREDENTIALS_MISSING: ["CREDENTIAL_NOT_CONFIGURED"],
    CREATE_ORDER_UNVERIFIED: ["CREATE_ORDER_UNVERIFIED"],
    VALIDATION_EXPIRED: ["VALIDATION_EVIDENCE_MISSING"],
    EVIDENCE_MISSING: ["VALIDATION_EVIDENCE_MISSING"],
    APPROVAL_MISSING: ["APPROVAL_MISSING"],
    APPROVAL_EXPIRED: ["APPROVAL_EXPIRED"],
    SCOPE_MISMATCH: ["SUPPLIER_SCOPE_MISMATCH"],
    LIMIT_MISMATCH: ["LIMIT_VALUE_EXCEEDED"],
    KILL_SWITCH: ["KILL_SWITCH_ACTIVE"],
    READINESS_BLOCKED: ["READINESS_NOT_READY"],
    CONCURRENCY: ["DUPLICATE_ARMING"],
  };
  const injectBlockers = map[type] || ["INJECTION_" + type];
  return { blockerCode: injectBlockers[0], injectBlockers };
}
