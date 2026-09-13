export type SupplierErrorCategory =
  | "TIMEOUT"
  | "RATE_LIMITED"
  | "AUTH_FAILED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "SERVER_ERROR"
  | "NETWORK_ERROR"
  | "MALFORMED_RESPONSE"
  | "VALIDATION_FAILED"
  | "SUPPLIER_UNAVAILABLE"
  | "UNKNOWN";

export interface ClassifiedSupplierError {
  code: SupplierErrorCategory;
  retryable: boolean;
  httpStatus?: number;
  message: string;
}

const RETRYABLE = new Set<SupplierErrorCategory>([
  "TIMEOUT",
  "RATE_LIMITED",
  "SERVER_ERROR",
  "NETWORK_ERROR",
  "SUPPLIER_UNAVAILABLE",
]);

const PERMANENT = new Set<SupplierErrorCategory>([
  "AUTH_FAILED",
  "FORBIDDEN",
  "NOT_FOUND",
  "VALIDATION_FAILED",
  "MALFORMED_RESPONSE",
]);

export function classifySupplierError(input: {
  code?: string;
  httpStatus?: number;
  message?: string;
}): ClassifiedSupplierError {
  const message = input.message || input.code || "Unknown supplier error";
  const status = input.httpStatus;
  const raw = String(input.code || "").toUpperCase();

  if (status === 401 || raw.includes("AUTH") || raw === "UNAUTHORIZED") {
    return { code: "AUTH_FAILED", retryable: false, httpStatus: status, message };
  }
  if (status === 403 || raw === "FORBIDDEN") {
    return { code: "FORBIDDEN", retryable: false, httpStatus: status, message };
  }
  if (status === 404 || raw === "NOT_FOUND") {
    return { code: "NOT_FOUND", retryable: false, httpStatus: status, message };
  }
  if (status === 429 || raw === "RATE_LIMITED" || raw === "RATE_LIMITED") {
    return { code: "RATE_LIMITED", retryable: true, httpStatus: status, message };
  }
  if (status === 502 || status === 503 || status === 500 || raw.includes("SERVER")) {
    return { code: "SERVER_ERROR", retryable: true, httpStatus: status, message };
  }
  if (raw === "TIMEOUT" || raw === "ETIMEDOUT") {
    return { code: "TIMEOUT", retryable: true, httpStatus: status, message };
  }
  if (raw === "NETWORK_ERROR" || raw === "ECONNREFUSED" || raw === "ENOTFOUND") {
    return { code: "NETWORK_ERROR", retryable: true, httpStatus: status, message };
  }
  if (raw.includes("MALFORMED") || raw.includes("PARSE")) {
    return { code: "MALFORMED_RESPONSE", retryable: false, httpStatus: status, message };
  }
  if (raw === "VALIDATION_FAILED") {
    return { code: "VALIDATION_FAILED", retryable: false, httpStatus: status, message };
  }
  if (raw === "SUPPLIER_UNAVAILABLE") {
    return { code: "SUPPLIER_UNAVAILABLE", retryable: true, httpStatus: status, message };
  }

  const code = (raw as SupplierErrorCategory) || "UNKNOWN";
  return {
    code: PERMANENT.has(code) || RETRYABLE.has(code) ? code : "UNKNOWN",
    retryable: RETRYABLE.has(code),
    httpStatus: status,
    message,
  };
}

export function isClassifiedRetryable(error: ClassifiedSupplierError): boolean {
  return error.retryable && !PERMANENT.has(error.code);
}
