import { randomUUID } from "crypto";
import { classifySupplierError } from "../errors";
import { handleRateLimitResponse } from "../rateLimit";
import { withRetry, isRetryableError } from "../retry";
import { logSupplierOperation, recordSupplierRequestMetric } from "../observability";
import { extractAllowedHosts, validateSupplierEndpoint } from "./allowlist";
import { SUPPLIER_NETWORK_CONFIG, isSupplierNetworkEnabled } from "./config";
import { canUseScopedValidationNetwork } from "./scopedValidationNetwork";
import { validateContentType, validateResponseSize } from "./responseSecurity";
import type { SupplierHttpRequest, SupplierHttpResponse, SupplierTransport, SupplierTransportError } from "./types";

export class SupplierHttpTransport implements SupplierTransport {
  private allowedHosts: string[];

  constructor(allowedHosts: string[] = []) {
    this.allowedHosts = allowedHosts;
  }

  async request(req: SupplierHttpRequest): Promise<SupplierHttpResponse> {
    if (!isSupplierNetworkEnabled() && !canUseScopedValidationNetwork()) {
      throw transportError("NETWORK_DISABLED", "Supplier network is disabled", false);
    }

    const endpointCheck = validateSupplierEndpoint(req.url, this.allowedHosts);
    if (!endpointCheck.allowed) {
      throw transportError(endpointCheck.reason || "ENDPOINT_INVALID", "Endpoint not allowed", false);
    }

    const correlationId = req.correlationId || randomUUID();
    const timeoutMs = req.timeoutMs ?? SUPPLIER_NETWORK_CONFIG.defaultTimeoutMs;
    const started = Date.now();

    return withRetry(
      async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const response = await fetch(req.url, {
            method: req.method || "GET",
            headers: {
              Accept: "application/json",
              "X-Correlation-Id": correlationId,
              ...req.headers,
            },
            body: req.body as BodyInit | undefined,
            signal: controller.signal,
            redirect: req.allowRedirects === false ? "manual" : "follow",
          });

          const rawBody = await response.text();
          const sizeCheck = validateResponseSize(rawBody);
          const contentType = response.headers.get("content-type") || undefined;
          const contentCheck = validateContentType(contentType, "any");

          if (!sizeCheck.ok) {
            throw transportError("RESPONSE_TOO_LARGE", "Supplier response exceeded size limit", false, correlationId);
          }
          if (!contentCheck.ok) {
            throw transportError(contentCheck.reason || "INVALID_CONTENT_TYPE", "Invalid content type", false, correlationId);
          }

          if (response.status === 429) {
            const retryAfter = handleRateLimitResponse(response.headers.get("retry-after") || undefined);
            throw transportError("RATE_LIMITED", "Rate limited by supplier", true, correlationId, 429, retryAfter);
          }

          if (response.status >= 500) {
            throw transportError("SERVER_ERROR", `Supplier server error ${response.status}`, true, correlationId, response.status);
          }

          if (response.status === 401 || response.status === 403) {
            throw transportError(
              response.status === 401 ? "AUTH_FAILED" : "FORBIDDEN",
              `Supplier auth error ${response.status}`,
              false,
              correlationId,
              response.status
            );
          }

          const durationMs = Date.now() - started;
          const headers: Record<string, string> = {};
          response.headers.forEach((value, key) => {
            headers[key.toLowerCase()] = value;
          });

          const result: SupplierHttpResponse = {
            ok: response.ok,
            status: response.status,
            headers,
            body: sizeCheck.body,
            durationMs,
            correlationId,
            contentType,
            truncated: sizeCheck.truncated,
          };

          recordSupplierRequestMetric({
            supplierId: req.supplierId,
            operation: req.operation,
            success: response.ok,
            latencyMs: durationMs,
            statusCode: response.status,
            rateLimited: response.status === 429,
            authFailure: response.status === 401 || response.status === 403,
          });

          logSupplierOperation({
            supplierId: req.supplierId,
            connector: "http",
            operation: req.operation,
            durationMs,
            status: response.ok ? "SUCCESS" : "FAILURE",
            records: 0,
            correlationId,
            errorCode: response.ok ? undefined : String(response.status),
          });

          return result;
        } catch (err) {
          if (err && typeof err === "object" && "code" in err) throw err;
          const isAbort = err instanceof Error && err.name === "AbortError";
          const classified = classifySupplierError({
            code: isAbort ? "TIMEOUT" : "NETWORK_ERROR",
            message: err instanceof Error ? err.message : "Network request failed",
          });
          recordSupplierRequestMetric({
            supplierId: req.supplierId,
            operation: req.operation,
            success: false,
            latencyMs: Date.now() - started,
            rateLimited: classified.code === "RATE_LIMITED",
            authFailure: classified.code === "AUTH_FAILED",
          });
          throw transportError(classified.code, classified.message, classified.retryable, correlationId);
        } finally {
          clearTimeout(timer);
        }
      },
      {
        maxAttempts: SUPPLIER_NETWORK_CONFIG.maxRetries,
        baseDelayMs: 500,
        maxDelayMs: 30_000,
      }
    );
  }
}

function transportError(
  code: string,
  message: string,
  retryable = false,
  correlationId?: string,
  httpStatus?: number,
  retryAfterMs?: number
): SupplierTransportError & Error {
  const err = new Error(message) as SupplierTransportError & Error;
  err.code = code;
  err.message = message;
  err.retryable = retryable && isRetryableError({ code, retryable });
  err.correlationId = correlationId;
  err.httpStatus = httpStatus;
  if (retryAfterMs) {
    void retryAfterMs;
  }
  return err;
}

export function createSupplierHttpTransport(baseUrl?: string, extraAllowed: string[] = []): SupplierHttpTransport {
  return new SupplierHttpTransport(extractAllowedHosts(baseUrl, extraAllowed));
}
