const SERVER_ONLY_FIELDS = new Set([
  "supplierQuantity",
  "quantity",
  "availableQuantity",
  "saleableQuantity",
  "reservedQuantity",
  "stockStatus",
  "supplierLastUpdatedAt",
  "lastSuccessfulSync",
  "lastSuccessfulSyncAt",
  "lastSyncedAt",
  "stockBuffer",
  "marketAvailability",
  "channelAvailability",
  "isStale",
]);

const SECRET_PATTERNS = [
  /api[_-]?key/i,
  /secret/i,
  /password/i,
  /token/i,
  /authorization/i,
  /bearer/i,
  /credential/i,
];

export function isServerOnlyInventoryField(fieldName: string): boolean {
  return SERVER_ONLY_FIELDS.has(fieldName);
}

export function rejectClientInventoryModification(body: Record<string, unknown>): {
  allowed: boolean;
  reason?: string;
} {
  for (const key of Object.keys(body)) {
    if (SECRET_PATTERNS.some((p) => p.test(key))) {
      return { allowed: false, reason: "CREDENTIALS_NOT_ALLOWED_ON_CLIENT" };
    }
    if (isServerOnlyInventoryField(key)) {
      return { allowed: false, reason: "INVENTORY_FIELDS_NOT_CLIENT_WRITABLE" };
    }
  }
  return { allowed: true };
}

export function validateInventoryRequest(input: {
  productId?: string;
  supplierId?: string;
  supplierOfferId?: string;
  marketId?: string;
  channel?: string;
  quantity?: number;
}): { valid: boolean; reason?: string } {
  if (!input.productId?.trim()) return { valid: false, reason: "PRODUCT_ID_MISSING" };
  if (!input.supplierId?.trim()) return { valid: false, reason: "SUPPLIER_ID_MISSING" };
  if (!input.supplierOfferId?.trim()) return { valid: false, reason: "SUPPLIER_OFFER_ID_MISSING" };
  if (input.quantity != null && (input.quantity < 0 || !Number.isFinite(input.quantity))) {
    return { valid: false, reason: "INVALID_QUANTITY" };
  }
  return { valid: true };
}

export function sanitizeClientInventoryPatch<T extends Record<string, unknown>>(existing: T, patch: T): T {
  const sanitized = { ...existing };
  for (const key of Object.keys(patch)) {
    if (!isServerOnlyInventoryField(key)) {
      (sanitized as Record<string, unknown>)[key] = patch[key];
    }
  }
  return sanitized;
}
