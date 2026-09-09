const SECRET_PATTERNS = [
  /api[_-]?key/i,
  /secret/i,
  /password/i,
  /token/i,
  /authorization/i,
  /bearer/i,
  /credential/i,
];

export function isSecretField(fieldName: string): boolean {
  return SECRET_PATTERNS.some((p) => p.test(fieldName));
}

export function redactSecrets(obj: unknown): unknown {
  if (obj == null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(redactSecrets);

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (isSecretField(key)) {
      result[key] = "[REDACTED]";
    } else if (typeof value === "object") {
      result[key] = redactSecrets(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/** Credentials are server-only — reject client-side credential payloads. */
export function rejectClientCredentials(payload: Record<string, unknown>): boolean {
  return Object.keys(payload).some(isSecretField);
}

export function sanitizeClientSyncRequest(body: Record<string, unknown>): {
  allowed: boolean;
  reason?: string;
} {
  if (rejectClientCredentials(body)) {
    return { allowed: false, reason: "CREDENTIALS_NOT_ALLOWED_ON_CLIENT" };
  }
  if (body.supplierPrice != null || body.supplierStock != null) {
    return { allowed: false, reason: "COMMERCIAL_FIELDS_NOT_CLIENT_WRITABLE" };
  }
  return { allowed: true };
}
