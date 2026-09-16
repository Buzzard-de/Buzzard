import type { FailureInjectionType, RehearsalStageName, RehearsalStageStatus } from "./types";

export interface FailureInjectionSpec {
  stage: RehearsalStageName;
  expectedStatus: RehearsalStageStatus;
  message: string;
}

export function resolveFailureInjection(type: FailureInjectionType): FailureInjectionSpec | null {
  switch (type) {
    case "NONE":
      return null;
    case "MISSING_CREDENTIAL":
      return { stage: "SUPPLIER_READINESS", expectedStatus: "BLOCKED", message: "Injected missing credential" };
    case "SUPPLIER_DISABLED":
      return { stage: "SUPPLIER_SELECTION", expectedStatus: "BLOCKED", message: "Injected supplier disabled" };
    case "STALE_STOCK":
      return { stage: "SUPPLIER_READINESS", expectedStatus: "BLOCKED", message: "Injected stale stock" };
    case "PRICE_MISMATCH":
      return { stage: "PRICE_SNAPSHOT", expectedStatus: "BLOCKED", message: "Injected price mismatch" };
    case "INVENTORY_RESERVATION_FAILURE":
      return { stage: "INVENTORY_RESERVATION", expectedStatus: "BLOCKED", message: "Injected reservation failure" };
    case "READINESS_BLOCKED":
      return { stage: "SUPPLIER_READINESS", expectedStatus: "BLOCKED", message: "Injected readiness blocked" };
    case "APPROVAL_EXPIRED":
      return { stage: "APPROVAL", expectedStatus: "BLOCKED", message: "Injected expired approval" };
    case "SELF_APPROVAL":
      return { stage: "APPROVAL", expectedStatus: "BLOCKED", message: "Injected self approval" };
    case "RISK_LIMIT_EXCEEDED":
      return { stage: "ORDER_LIMIT", expectedStatus: "BLOCKED", message: "Injected risk limit exceeded" };
    case "KILL_SWITCH_ENABLED":
      return { stage: "KILL_SWITCH", expectedStatus: "BLOCKED", message: "Injected kill switch" };
    case "CONNECTOR_UNAVAILABLE":
      return { stage: "SANDBOX_SUPPLIER_ACCEPTANCE", expectedStatus: "FAIL", message: "Injected connector unavailable" };
    case "TIMEOUT":
    case "HTTP_429":
    case "HTTP_5XX":
      return { stage: "SANDBOX_SUPPLIER_ACCEPTANCE", expectedStatus: "FAIL", message: `Injected ${type}` };
    case "MALFORMED_SUPPLIER_RESPONSE":
      return { stage: "SIMULATED_CONFIRMATION", expectedStatus: "FAIL", message: "Injected malformed response" };
    case "DUPLICATE_ORDER":
      return { stage: "SANDBOX_SUPPLIER_ACCEPTANCE", expectedStatus: "FAIL", message: "Injected duplicate order idempotency" };
    case "DUPLICATE_TRACKING":
      return { stage: "SIMULATED_TRACKING", expectedStatus: "FAIL", message: "Injected duplicate tracking" };
    case "CONTROL_TOWER_MISMATCH":
      return { stage: "CONTROL_TOWER_RECONCILIATION", expectedStatus: "FAIL", message: "Injected control tower mismatch" };
    default:
      return null;
  }
}
