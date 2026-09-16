import type { ReadinessCheckResult, ReadinessScope } from "@/lib/supplier-order-readiness/types";
import { getLatestValidationForScope } from "./persistence";

function pass(code: string, category: string, message: string): ReadinessCheckResult {
  return { code, category, level: "PASS", message, blocking: false };
}

function block(code: string, category: string, message: string): ReadinessCheckResult {
  return { code, category, level: "BLOCKED", message, blocking: true };
}

function warn(code: string, category: string, message: string): ReadinessCheckResult {
  return { code, category, level: "WARNING", message, blocking: false };
}

/**
 * #341 createOrder production validation checks for #337/#339 readiness integration.
 */
export function evaluateCreateOrderProductionValidationChecks(scope: ReadinessScope): ReadinessCheckResult[] {
  const results: ReadinessCheckResult[] = [];
  const validation = getLatestValidationForScope({
    supplierId: scope.supplierId,
    market: scope.market,
    channel: scope.channel,
    environment: scope.environment || "PRODUCTION",
  });

  if (!validation) {
    results.push(block("CREATE_ORDER_VALIDATION_MISSING", "CREATE_ORDER", "createOrder production validation not run"));
    return results;
  }

  results.push(pass("CREATE_ORDER_VALIDATION_EXISTS", "CREATE_ORDER", `Validation ${validation.validationId}`));

  if (validation.createOrderCapability === "UNVERIFIED") {
    results.push(
      block("REAL_ORDER_ENDPOINT_NOT_VALIDATED", "CREATE_ORDER", "createOrder capability UNVERIFIED — #341 boundary"),
    );
  } else if (validation.createOrderCapability === "VALIDATED") {
    results.push(pass("CREATE_ORDER_VALIDATED", "CREATE_ORDER", "createOrder production validated"));
  } else {
    results.push(block("CREATE_ORDER_BLOCKED", "CREATE_ORDER", "createOrder capability blocked"));
  }

  if (validation.unknownOutcome) {
    results.push(warn("CREATE_ORDER_UNKNOWN_OUTCOME", "CREATE_ORDER", "Unknown outcome pending resolution"));
  }

  if (validation.humanReviewRequired) {
    results.push(warn("CREATE_ORDER_HUMAN_REVIEW", "CREATE_ORDER", "Human review required"));
  }

  if (validation.overallStatus === "BLOCKED" || validation.overallStatus === "FAILED") {
    results.push(block("CREATE_ORDER_VALIDATION_BLOCKED", "CREATE_ORDER", `Validation ${validation.overallStatus}`));
  }

  return results;
}
