const BLOCKED_KEYS =
  /payment|card|cvv|cvc|iban|bic|password|secret|token|oauth|api[_-]?key|authorization|admin|ai[_-]?context|email|phone/i;
const PII_LOG_KEYS = /email|phone|recipient|address|street|postal|city|name/i;

export function filterSupplierFulfillmentAddress(
  address: Record<string, string> | undefined
): Record<string, string> {
  if (!address) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(address)) {
    if (BLOCKED_KEYS.test(key)) continue;
    if (!value?.trim()) continue;
    out[key] = value.trim();
  }
  if (!out.country && address.country) out.country = address.country;
  return out;
}

export function sanitizePayloadForInspection(payload: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (BLOCKED_KEYS.test(key)) {
      out[key] = "[REDACTED]";
      continue;
    }
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      out[key] = sanitizePayloadForInspection(value as Record<string, unknown>);
    } else if (PII_LOG_KEYS.test(key) && typeof value === "string") {
      out[key] = maskPiiValue(value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

export function maskPiiValue(value: string): string {
  if (value.length <= 4) return "****";
  return `${value.slice(0, 2)}${"*".repeat(Math.min(6, value.length - 2))}`;
}

export function assertNoSecretsInPayload(payload: Record<string, unknown>): string[] {
  const violations: string[] = [];
  const walk = (obj: Record<string, unknown>, path = "") => {
    for (const [key, value] of Object.entries(obj)) {
      const full = path ? `${path}.${key}` : key;
      if (BLOCKED_KEYS.test(key)) violations.push(full);
      if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        walk(value as Record<string, unknown>, full);
      }
    }
  };
  walk(payload);
  return violations;
}
