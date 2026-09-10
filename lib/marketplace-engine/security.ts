const SERVER_ONLY_FIELDS = new Set([
  "marketplaceListingId",
  "listingId",
  "marketplacePrice",
  "marketplaceStock",
  "price",
  "stock",
  "orderId",
  "orderMapping",
  "connectorStatus",
  "status",
  "credentials",
  "apiKey",
  "apiSecret",
  "accessToken",
  "refreshToken",
  "webhookSecret",
  "payloadHash",
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

export function isServerOnlyMarketplaceField(fieldName: string): boolean {
  return SERVER_ONLY_FIELDS.has(fieldName);
}

export function rejectClientMarketplaceModification(body: Record<string, unknown>): {
  allowed: boolean;
  reason?: string;
} {
  for (const key of Object.keys(body)) {
    if (SECRET_PATTERNS.some((p) => p.test(key))) {
      return { allowed: false, reason: "CREDENTIALS_NOT_ALLOWED_ON_CLIENT" };
    }
    if (isServerOnlyMarketplaceField(key)) {
      return { allowed: false, reason: "MARKETPLACE_FIELDS_NOT_CLIENT_WRITABLE" };
    }
  }
  return { allowed: true };
}

export function sanitizeClientMarketplacePatch<T extends Record<string, unknown>>(
  existing: T,
  patch: T
): T {
  const sanitized = { ...existing };
  for (const key of Object.keys(patch)) {
    if (!isServerOnlyMarketplaceField(key)) {
      (sanitized as Record<string, unknown>)[key] = patch[key];
    }
  }
  return sanitized;
}

export function redactMarketplaceSecrets(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SECRET_PATTERNS.some((p) => p.test(key))) {
      result[key] = "[REDACTED]";
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      result[key] = redactMarketplaceSecrets(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}
