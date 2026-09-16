import { validateSupplierEndpoint, extractAllowedHosts } from "@/lib/supplier-engine/network/allowlist";
import { recordValidationAudit } from "./audit";
import type { EndpointClassification } from "./types";

const READ_METHODS = new Set(["GET", "HEAD"]);
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function classifyEndpoint(path: string): EndpointClassification {
  const normalized = path.toLowerCase();
  if (normalized.includes("order") && (normalized.includes("create") || normalized.includes("submit"))) {
    return "ORDER_CREATE";
  }
  if (normalized.includes("order") && normalized.includes("status")) return "ORDER_STATUS";
  if (normalized.includes("track")) return "TRACKING";
  if (normalized.includes("return") || normalized.includes("rma")) return "RETURN";
  if (normalized.includes("refund") || normalized.includes("credit")) return "REFUND";
  if (normalized.includes("catalog") || normalized.includes("product")) return "CATALOG";
  if (normalized.includes("stock") || normalized.includes("inventory")) return "STOCK";
  if (normalized.includes("pric") || normalized.includes("quote")) return "PRICE";
  if (normalized.includes("health") || normalized.includes("category")) return "HEALTH";
  return "UNKNOWN";
}

export function validateEndpointUrl(
  url: string,
  allowedHosts: string[],
  requireHttpsForProduction = false
): { allowed: boolean; reason?: string; hostname?: string } {
  const check = validateSupplierEndpoint(url, allowedHosts);
  if (!check.allowed) return check;
  if (requireHttpsForProduction) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:") {
        return { allowed: false, reason: "NON_HTTPS_PRODUCTION", hostname: parsed.hostname };
      }
    } catch {
      return { allowed: false, reason: "INVALID_URL" };
    }
  }
  return check;
}

export function guardHttpMethod(
  method: string,
  endpointPath: string,
  context: { correlationId: string; validationId?: string; supplierId?: string }
): { allowed: boolean; reason?: string; classification: EndpointClassification } {
  const classification = classifyEndpoint(endpointPath);
  const upper = method.toUpperCase();

  if (classification === "UNKNOWN") {
    return { allowed: false, reason: "UNKNOWN_ENDPOINT", classification };
  }

  if (classification === "ORDER_CREATE" || classification === "RETURN" || classification === "REFUND") {
    recordValidationAudit({
      type: "SECURITY_VIOLATION",
      validationId: context.validationId,
      supplierId: context.supplierId,
      correlationId: context.correlationId,
      detail: { method: upper, endpoint: endpointPath, classification, code: "NEVER_EXECUTE" },
    });
    return { allowed: false, reason: "NEVER_EXECUTE", classification };
  }

  if (WRITE_METHODS.has(upper)) {
    recordValidationAudit({
      type: "SECURITY_VIOLATION",
      validationId: context.validationId,
      supplierId: context.supplierId,
      correlationId: context.correlationId,
      detail: { method: upper, endpoint: endpointPath, code: "WRITE_METHOD_BLOCKED" },
    });
    return { allowed: false, reason: "WRITE_METHOD_BLOCKED", classification };
  }

  if (!READ_METHODS.has(upper)) {
    return { allowed: false, reason: "METHOD_NOT_ALLOWED", classification };
  }

  return { allowed: true, classification };
}

export function extractProfileAllowedHosts(baseUrl?: string, extra: string[] = []): string[] {
  return extractAllowedHosts(baseUrl, extra);
}

export function blockOrderEndpointAttempt(
  url: string,
  context: { correlationId: string; validationId?: string; supplierId?: string }
): { blocked: true; code: string } {
  recordValidationAudit({
    type: "REAL_ORDER_ATTEMPT_BLOCKED",
    validationId: context.validationId,
    supplierId: context.supplierId,
    correlationId: context.correlationId,
    detail: { url: url.replace(/\/\/[^@]+@/, "//[REDACTED]@"), code: "CREATE_ORDER_NEVER_CALLED" },
  });
  return { blocked: true, code: "CREATE_ORDER_NEVER_CALLED" };
}
