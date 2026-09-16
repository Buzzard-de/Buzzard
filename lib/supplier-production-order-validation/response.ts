import type { SupplierResponseClass, ValidationCheckResult } from "./types";

export interface ParsedSupplierResponse {
  responseClass: SupplierResponseClass;
  supplierOrderId?: string;
  httpStatus?: number;
  retryable: boolean;
  humanReviewRequired: boolean;
  message: string;
}

export function classifyHttpError(status: number): ParsedSupplierResponse {
  if (status === 400 || status === 422) {
    return {
      responseClass: "validation_error",
      httpStatus: status,
      retryable: false,
      humanReviewRequired: false,
      message: "Permanent validation error",
    };
  }
  if (status === 401) {
    return {
      responseClass: "authentication_error",
      httpStatus: status,
      retryable: false,
      humanReviewRequired: true,
      message: "Authentication failure",
    };
  }
  if (status === 403) {
    return {
      responseClass: "authorization_error",
      httpStatus: status,
      retryable: false,
      humanReviewRequired: true,
      message: "Authorization failure",
    };
  }
  if (status === 404) {
    return {
      responseClass: "validation_error",
      httpStatus: status,
      retryable: false,
      humanReviewRequired: true,
      message: "Endpoint/contract issue",
    };
  }
  if (status === 409) {
    return {
      responseClass: "duplicate",
      httpStatus: status,
      retryable: false,
      humanReviewRequired: false,
      message: "Duplicate/conflict",
    };
  }
  if (status === 429) {
    return {
      responseClass: "rate_limited",
      httpStatus: status,
      retryable: true,
      humanReviewRequired: false,
      message: "Rate limited",
    };
  }
  if (status >= 500) {
    return {
      responseClass: "server_error",
      httpStatus: status,
      retryable: true,
      humanReviewRequired: false,
      message: "Retryable supplier failure",
    };
  }
  return {
    responseClass: "unknown",
    httpStatus: status,
    retryable: false,
    humanReviewRequired: true,
    message: "Unknown response",
  };
}

export function parseInterCarsCreateOrderResponse(body: unknown, httpStatus: number): ParsedSupplierResponse {
  if (httpStatus >= 400) return classifyHttpError(httpStatus);

  if (!body || typeof body !== "object") {
    return {
      responseClass: "unknown",
      httpStatus,
      retryable: false,
      humanReviewRequired: true,
      message: "Malformed response",
    };
  }

  const record = body as Record<string, unknown>;
  const supplierOrderId =
    (record.orderId as string) ||
    (record.supplierOrderId as string) ||
    (record.id as string) ||
    undefined;

  const statusRaw = String(record.status || record.orderStatus || "").toLowerCase();
  if (statusRaw.includes("reject")) {
    return {
      responseClass: "rejected",
      httpStatus,
      supplierOrderId,
      retryable: false,
      humanReviewRequired: true,
      message: "Order rejected by supplier",
    };
  }
  if (statusRaw.includes("pending")) {
    return {
      responseClass: "pending",
      httpStatus,
      supplierOrderId,
      retryable: false,
      humanReviewRequired: false,
      message: "Order pending",
    };
  }
  if (statusRaw.includes("duplicate")) {
    return {
      responseClass: "duplicate",
      httpStatus,
      supplierOrderId,
      retryable: false,
      humanReviewRequired: false,
      message: "Duplicate order",
    };
  }

  if (!supplierOrderId) {
    return {
      responseClass: "unknown",
      httpStatus,
      retryable: false,
      humanReviewRequired: true,
      message: "Missing supplier order ID",
    };
  }

  return {
    responseClass: "accepted",
    httpStatus,
    supplierOrderId,
    retryable: false,
    humanReviewRequired: false,
    message: "Order accepted",
  };
}

export function validateResponseContract(parsed: ParsedSupplierResponse): ValidationCheckResult {
  if (parsed.responseClass === "accepted" && parsed.supplierOrderId) {
    return { check: "RESPONSE_SCHEMA", category: "RESPONSE", status: "PASS", message: "Response validated" };
  }
  if (parsed.responseClass === "duplicate") {
    return { check: "RESPONSE_SCHEMA", category: "RESPONSE", status: "WARNING", message: "Duplicate response" };
  }
  return {
    check: "RESPONSE_SCHEMA",
    category: "RESPONSE",
    status: "BLOCKED",
    message: parsed.message,
    blocking: true,
  };
}
