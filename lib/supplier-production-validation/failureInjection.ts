import type { FailureInjectionType, ValidationCheckResult } from "./types";

export interface FailureInjectionSpec {
  check: string;
  status: "BLOCKED" | "FAIL" | "SKIPPED";
  message: string;
  blockerCode?: string;
}

export function resolveFailureInjection(type: FailureInjectionType): FailureInjectionSpec | null {
  switch (type) {
    case "NONE":
      return null;
    case "CREDENTIAL_MISSING":
      return { check: "CREDENTIAL_CONFIGURED", status: "BLOCKED", message: "Injected missing credential", blockerCode: "CREDENTIAL_NOT_CONFIGURED" };
    case "CREDENTIAL_INVALID":
      return { check: "CREDENTIAL_VALID", status: "BLOCKED", message: "Injected invalid credential", blockerCode: "CREDENTIAL_INVALID" };
    case "CREDENTIAL_EXPIRED":
      return { check: "CREDENTIAL_VALID", status: "BLOCKED", message: "Injected expired credential", blockerCode: "CREDENTIAL_EXPIRED" };
    case "ENVIRONMENT_MISMATCH":
      return { check: "ENVIRONMENT_SEPARATION", status: "BLOCKED", message: "Injected environment mismatch", blockerCode: "ENVIRONMENT_MISMATCH" };
    case "ENDPOINT_MISMATCH":
      return { check: "ENDPOINT_VALIDATION", status: "BLOCKED", message: "Injected endpoint mismatch", blockerCode: "ENDPOINT_MISMATCH" };
    case "HEALTH_FAILURE":
      return { check: "HEALTH_READ", status: "FAIL", message: "Injected health failure" };
    case "CATALOG_FAILURE":
      return { check: "CATALOG_READ", status: "FAIL", message: "Injected catalog failure" };
    case "STOCK_FAILURE":
      return { check: "STOCK_READ", status: "FAIL", message: "Injected stock failure" };
    case "PRICE_FAILURE":
      return { check: "PRICE_READ", status: "FAIL", message: "Injected price failure" };
    case "STALE_DATA":
      return { check: "DATA_FRESHNESS", status: "BLOCKED", message: "Injected stale data", blockerCode: "STALE_DATA" };
    case "SSRF_URL":
    case "PRIVATE_IP":
      return { check: "ENDPOINT_VALIDATION", status: "BLOCKED", message: `Injected ${type}`, blockerCode: type };
    case "REDIRECT_ATTACK":
      return { check: "ENDPOINT_VALIDATION", status: "BLOCKED", message: "Injected redirect attack", blockerCode: "REDIRECT_BLOCKED" };
    case "UNKNOWN_ENDPOINT":
      return { check: "ENDPOINT_CLASSIFICATION", status: "BLOCKED", message: "Injected unknown endpoint", blockerCode: "UNKNOWN_ENDPOINT" };
    case "POST_ORDER_ENDPOINT":
      return { check: "HTTP_METHOD_GUARD", status: "BLOCKED", message: "Injected POST to order endpoint", blockerCode: "SECURITY_VIOLATION" };
    case "SUPPLIER_DISABLED":
      return { check: "SUPPLIER_IDENTITY", status: "BLOCKED", message: "Injected supplier disabled", blockerCode: "SUPPLIER_DISABLED" };
    case "MARKET_UNSUPPORTED":
      return { check: "MARKET_ELIGIBILITY", status: "BLOCKED", message: "Injected unsupported market", blockerCode: "MARKET_UNSUPPORTED" };
    case "CHANNEL_UNSUPPORTED":
      return { check: "CHANNEL_ELIGIBILITY", status: "BLOCKED", message: "Injected unsupported channel", blockerCode: "CHANNEL_UNSUPPORTED" };
    case "CAPABILITY_MISMATCH":
      return { check: "FULFILLMENT_CAPABILITIES", status: "BLOCKED", message: "Injected capability mismatch", blockerCode: "CAPABILITY_MISMATCH" };
    case "KILL_SWITCH":
      return { check: "KILL_SWITCH", status: "BLOCKED", message: "Injected kill switch", blockerCode: "KILL_SWITCH" };
    case "READINESS_BLOCKER":
      return { check: "READINESS_INTEGRATION", status: "BLOCKED", message: "Injected readiness blocker", blockerCode: "READINESS_BLOCKED" };
    case "MALFORMED_JSON":
    case "MALFORMED_XML":
      return { check: "RESPONSE_VALIDATION", status: "FAIL", message: `Injected ${type}` };
    default:
      return null;
  }
}

export function applyFailureInjection(
  checks: ValidationCheckResult[],
  injection: FailureInjectionSpec
): ValidationCheckResult[] {
  return [
    ...checks,
    { check: injection.check, status: injection.status, message: injection.message },
  ];
}
