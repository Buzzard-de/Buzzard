const SERVER_ONLY_FIELDS = new Set([
  "supplierCost",
  "supplierPrice",
  "supplierNetPrice",
  "shippingCost",
  "marketplaceFee",
  "paymentFee",
  "returnCostReserve",
  "refundCostReserve",
  "returnReserve",
  "targetMargin",
  "targetMarginPercent",
  "minimumMarginPercent",
  "calculatedPrice",
  "customerNetPrice",
  "customerGrossPrice",
  "customerVat",
  "margin",
  "buzzardContributionMargin",
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

export function isServerOnlyPricingField(fieldName: string): boolean {
  return SERVER_ONLY_FIELDS.has(fieldName);
}

export function rejectClientPricingModification(body: Record<string, unknown>): {
  allowed: boolean;
  reason?: string;
} {
  for (const key of Object.keys(body)) {
    if (SECRET_PATTERNS.some((p) => p.test(key))) {
      return { allowed: false, reason: "CREDENTIALS_NOT_ALLOWED_ON_CLIENT" };
    }
    if (isServerOnlyPricingField(key)) {
      return { allowed: false, reason: "PRICING_FIELDS_NOT_CLIENT_WRITABLE" };
    }
  }
  return { allowed: true };
}

export function validatePricingRequest(input: {
  productId?: string;
  supplierId?: string;
  marketId?: string;
  channel?: string;
  currency?: string;
}): { valid: boolean; reason?: string } {
  if (!input.productId?.trim()) return { valid: false, reason: "PRODUCT_ID_MISSING" };
  if (!input.supplierId?.trim()) return { valid: false, reason: "SUPPLIER_ID_MISSING" };
  if (!input.marketId?.trim()) return { valid: false, reason: "MARKET_ID_MISSING" };
  if (!input.channel?.trim()) return { valid: false, reason: "CHANNEL_MISSING" };
  return { valid: true };
}

export function sanitizeClientPricingPatch<T extends Record<string, unknown>>(existing: T, patch: T): T {
  const sanitized = { ...existing };
  for (const key of Object.keys(patch)) {
    if (!isServerOnlyPricingField(key)) {
      (sanitized as Record<string, unknown>)[key] = patch[key];
    }
  }
  return sanitized;
}
