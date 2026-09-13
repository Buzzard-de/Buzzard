import type { SupplierOrderFailureClass } from "./types";

const RETRYABLE = new Set([
  "TIMEOUT",
  "RATE_LIMITED",
  "SERVER_ERROR",
  "503",
  "502",
  "500",
  "429",
  "SUPPLIER_TIMEOUT",
  "RETRYABLE_SUPPLIER_ERROR",
]);

const PERMANENT = new Set([
  "UNKNOWN_SUPPLIER",
  "SUPPLIER_DISABLED",
  "CONNECTOR_UNHEALTHY",
  "INSUFFICIENT_STOCK",
  "STALE_STOCK",
  "PAYLOAD_VALIDATION_FAILED",
  "PII_VIOLATION",
  "CAPABILITY_MISSING",
  "AUTH_FAILED",
  "403",
  "401",
  "INVALID_SUPPLIER",
  "DUPLICATE_ORDER",
]);

export function classifySupplierOrderFailure(code: string): SupplierOrderFailureClass {
  const normalized = code.toUpperCase();
  if (PERMANENT.has(normalized)) return "PERMANENT";
  if (RETRYABLE.has(normalized)) return "RETRYABLE";
  if (/^5\d\d$/.test(normalized) || normalized.includes("TIMEOUT") || normalized.includes("RATE")) {
    return "RETRYABLE";
  }
  return "PERMANENT";
}

export function failureResult(code: string, message: string) {
  return {
    ok: false as const,
    failureClass: classifySupplierOrderFailure(code),
    failureCode: code,
    failureMessage: message,
  };
}
