import type { ParsedSupplierResponse } from "./response";
import type { ValidationCheckResult } from "./types";

export type CreateOrderFailureInjection =
  | "NONE"
  | "HTTP_400"
  | "HTTP_401"
  | "HTTP_403"
  | "HTTP_404"
  | "HTTP_409"
  | "HTTP_429"
  | "HTTP_500"
  | "HTTP_502"
  | "HTTP_503"
  | "TIMEOUT"
  | "CONNECTION_RESET"
  | "MALFORMED_JSON"
  | "INVALID_SUPPLIER_RESPONSE"
  | "MISSING_SUPPLIER_ORDER_ID"
  | "DUPLICATE_RESPONSE"
  | "UNKNOWN_OUTCOME"
  | "IDEMPOTENCY_CONFLICT"
  | "PRICE_MISMATCH"
  | "STOCK_MISMATCH"
  | "MISSING_RESERVATION"
  | "INVALID_SUPPLIER_ASSIGNMENT"
  | "EXPIRED_APPROVAL"
  | "KILL_SWITCH_ON"
  | "SSRF"
  | "PRIVATE_IP"
  | "HTTP_NOT_HTTPS"
  | "SECRET_LEAK"
  | "AI_BOUNDARY";

export function resolveCreateOrderFailureInjection(
  type: CreateOrderFailureInjection,
): { blockerCode: string; stage: string; mockResponse?: ParsedSupplierResponse } | null {
  const map: Record<
    CreateOrderFailureInjection,
    { blockerCode: string; stage: string; mockResponse?: ParsedSupplierResponse } | null
  > = {
    NONE: null,
    HTTP_400: { blockerCode: "HTTP_400", stage: "RESPONSE", mockResponse: { responseClass: "validation_error", retryable: false, humanReviewRequired: false, message: "400" } },
    HTTP_401: { blockerCode: "HTTP_401", stage: "RESPONSE", mockResponse: { responseClass: "authentication_error", retryable: false, humanReviewRequired: true, message: "401" } },
    HTTP_403: { blockerCode: "HTTP_403", stage: "RESPONSE", mockResponse: { responseClass: "authorization_error", retryable: false, humanReviewRequired: true, message: "403" } },
    HTTP_404: { blockerCode: "HTTP_404", stage: "RESPONSE", mockResponse: { responseClass: "validation_error", retryable: false, humanReviewRequired: true, message: "404" } },
    HTTP_409: { blockerCode: "HTTP_409", stage: "RESPONSE", mockResponse: { responseClass: "duplicate", retryable: false, humanReviewRequired: false, message: "409" } },
    HTTP_429: { blockerCode: "HTTP_429", stage: "RESPONSE", mockResponse: { responseClass: "rate_limited", retryable: true, humanReviewRequired: false, message: "429" } },
    HTTP_500: { blockerCode: "HTTP_500", stage: "RESPONSE", mockResponse: { responseClass: "server_error", retryable: true, humanReviewRequired: false, message: "500" } },
    HTTP_502: { blockerCode: "HTTP_502", stage: "RESPONSE", mockResponse: { responseClass: "server_error", retryable: true, humanReviewRequired: false, message: "502" } },
    HTTP_503: { blockerCode: "HTTP_503", stage: "RESPONSE", mockResponse: { responseClass: "server_error", retryable: true, humanReviewRequired: false, message: "503" } },
    TIMEOUT: { blockerCode: "TIMEOUT", stage: "NETWORK", mockResponse: { responseClass: "unknown", retryable: true, humanReviewRequired: true, message: "timeout" } },
    CONNECTION_RESET: { blockerCode: "CONNECTION_RESET", stage: "NETWORK", mockResponse: { responseClass: "unknown", retryable: true, humanReviewRequired: true, message: "connection reset" } },
    MALFORMED_JSON: { blockerCode: "MALFORMED_JSON", stage: "RESPONSE", mockResponse: { responseClass: "unknown", retryable: false, humanReviewRequired: true, message: "malformed json" } },
    INVALID_SUPPLIER_RESPONSE: { blockerCode: "INVALID_SUPPLIER_RESPONSE", stage: "RESPONSE" },
    MISSING_SUPPLIER_ORDER_ID: { blockerCode: "MISSING_SUPPLIER_ORDER_ID", stage: "RESPONSE", mockResponse: { responseClass: "unknown", retryable: false, humanReviewRequired: true, message: "missing id" } },
    DUPLICATE_RESPONSE: { blockerCode: "DUPLICATE_RESPONSE", stage: "RESPONSE", mockResponse: { responseClass: "duplicate", retryable: false, humanReviewRequired: false, message: "duplicate" } },
    UNKNOWN_OUTCOME: { blockerCode: "UNKNOWN_OUTCOME", stage: "NETWORK" },
    IDEMPOTENCY_CONFLICT: { blockerCode: "IDEMPOTENCY_CONFLICT", stage: "IDEMPOTENCY" },
    PRICE_MISMATCH: { blockerCode: "PRICE_SNAPSHOT_MISMATCH", stage: "PRICING" },
    STOCK_MISMATCH: { blockerCode: "INVENTORY_INSUFFICIENT", stage: "INVENTORY" },
    MISSING_RESERVATION: { blockerCode: "INVENTORY_RESERVATION_MISSING", stage: "INVENTORY" },
    INVALID_SUPPLIER_ASSIGNMENT: { blockerCode: "SUPPLIER_ASSIGNMENT_MISMATCH", stage: "SUPPLIER" },
    EXPIRED_APPROVAL: { blockerCode: "APPROVAL_EXPIRED", stage: "APPROVAL" },
    KILL_SWITCH_ON: { blockerCode: "KILL_SWITCH_ACTIVE", stage: "KILL_SWITCH" },
    SSRF: { blockerCode: "SSRF_URL", stage: "SECURITY" },
    PRIVATE_IP: { blockerCode: "PRIVATE_IP", stage: "SECURITY" },
    HTTP_NOT_HTTPS: { blockerCode: "NON_HTTPS_PRODUCTION", stage: "SECURITY" },
    SECRET_LEAK: { blockerCode: "SECRET_LEAK", stage: "SECURITY" },
    AI_BOUNDARY: { blockerCode: "AI_BOUNDARY", stage: "AI" },
  };
  return map[type] ?? null;
}

export function applyFailureInjectionToChecks(
  checks: ValidationCheckResult[],
  injection: { blockerCode: string; stage: string },
): ValidationCheckResult[] {
  checks.push({
    check: "FAILURE_INJECTION",
    category: injection.stage,
    status: "BLOCKED",
    message: injection.blockerCode,
    blocking: true,
  });
  return checks;
}
