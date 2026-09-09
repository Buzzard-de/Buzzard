const SERVER_ONLY_FIELDS = new Set([
  "supplierCostSnapshot",
  "supplierId",
  "supplierOfferId",
  "marginSnapshot",
  "priceSnapshot",
  "priceSnapshotId",
  "paymentStatus",
  "orderStatus",
  "status",
  "inventoryReservationId",
  "inventoryReservation",
  "supplierOrderStatus",
  "marketplaceFeeSnapshot",
  "paymentFeeSnapshot",
  "returnReserveSnapshot",
  "selectionScore",
  "supplierAssignments",
]);

const SECRET_PATTERNS = [
  /api[_-]?key/i,
  /secret/i,
  /password/i,
  /token/i,
  /authorization/i,
  /bearer/i,
  /credential/i,
  /cvv/i,
  /card/i,
];

export function isServerOnlyOrderField(fieldName: string): boolean {
  return SERVER_ONLY_FIELDS.has(fieldName);
}

export function rejectClientOrderModification(body: Record<string, unknown>): {
  allowed: boolean;
  reason?: string;
} {
  for (const key of Object.keys(body)) {
    if (SECRET_PATTERNS.some((p) => p.test(key))) {
      return { allowed: false, reason: "CREDENTIALS_NOT_ALLOWED_ON_CLIENT" };
    }
    if (isServerOnlyOrderField(key)) {
      return { allowed: false, reason: "ORDER_FIELDS_NOT_CLIENT_WRITABLE" };
    }
  }
  return { allowed: true };
}

export function canCustomerAccessOrder(orderCustomerId: string, requestCustomerId: string): boolean {
  return orderCustomerId === requestCustomerId;
}

export function sanitizeClientOrderPatch<T extends Record<string, unknown>>(existing: T, patch: T): T {
  const sanitized = { ...existing };
  for (const key of Object.keys(patch)) {
    if (!isServerOnlyOrderField(key)) {
      (sanitized as Record<string, unknown>)[key] = patch[key];
    }
  }
  return sanitized;
}
