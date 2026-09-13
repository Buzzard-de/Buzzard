import { classifySupplierError, isClassifiedRetryable } from "./errors";

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryableCodes?: Set<string>;
}

const DEFAULT_RETRYABLE = new Set([
  "TIMEOUT",
  "RATE_LIMITED",
  "SUPPLIER_UNAVAILABLE",
  "NETWORK_ERROR",
  "SERVER_ERROR",
  "rateLimited",
  "timeout",
  "supplierUnavailable",
]);

const PERMANENT_CODES = new Set([
  "AUTH_FAILED",
  "FORBIDDEN",
  "NOT_FOUND",
  "VALIDATION_FAILED",
  "MALFORMED_RESPONSE",
]);

export function isRetryableError(error: { code?: string; retryable?: boolean; httpStatus?: number; message?: string }): boolean {
  if (error.retryable === false) return false;
  const classified = classifySupplierError(error);
  if (PERMANENT_CODES.has(classified.code)) return false;
  if (isClassifiedRetryable(classified)) return true;
  if (error.retryable) return true;
  if (error.code && DEFAULT_RETRYABLE.has(error.code)) return true;
  return false;
}

export function computeBackoffDelay(attempt: number, baseDelayMs = 500, maxDelayMs = 30000): number {
  const delay = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
  return delay + Math.floor(Math.random() * 100);
}

export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 500;
  const maxDelayMs = options.maxDelayMs ?? 30000;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err;
      const retryable = isRetryableError(err as { code?: string; retryable?: boolean });
      if (!retryable || attempt >= maxAttempts) break;
      await new Promise((r) => setTimeout(r, computeBackoffDelay(attempt, baseDelayMs, maxDelayMs)));
    }
  }

  throw lastError;
}
