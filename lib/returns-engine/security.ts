const SERVER_ONLY_FIELDS = new Set([
  "supplierRecovery",
  "supplierCreditAmount",
  "supplierRefundAmount",
  "customerRefundAmount",
  "buzzardImpact",
  "buzzardLoss",
  "buzzardRecovery",
  "returnStatus",
  "status",
  "supplierReturnStatus",
  "disputeStatus",
  "reconciliation",
  "marginSnapshot",
  "supplierCostSnapshot",
  "financialReconciliation",
]);

const SECRET_PATTERNS = [
  /api[_-]?key/i,
  /secret/i,
  /password/i,
  /token/i,
  /credential/i,
  /bearer/i,
  /authorization/i,
  /cvv/i,
  /card/i,
];

export function isServerOnlyReturnField(fieldName: string): boolean {
  return SERVER_ONLY_FIELDS.has(fieldName);
}

export function rejectClientReturnModification(body: Record<string, unknown>): {
  allowed: boolean;
  reason?: string;
} {
  for (const key of Object.keys(body)) {
    if (SECRET_PATTERNS.some((p) => p.test(key))) {
      return { allowed: false, reason: "CREDENTIALS_NOT_ALLOWED_ON_CLIENT" };
    }
    if (isServerOnlyReturnField(key)) {
      return { allowed: false, reason: "RETURN_FIELDS_NOT_CLIENT_WRITABLE" };
    }
  }
  return { allowed: true };
}

export function canCustomerAccessReturn(returnCustomerId: string, requestCustomerId: string): boolean {
  return returnCustomerId === requestCustomerId;
}

export function sanitizeClientReturnPatch<T extends Record<string, unknown>>(
  existing: T,
  patch: T
): T {
  const sanitized = { ...existing };
  for (const key of Object.keys(patch)) {
    if (!isServerOnlyReturnField(key)) {
      (sanitized as Record<string, unknown>)[key] = patch[key];
    }
  }
  return sanitized;
}
