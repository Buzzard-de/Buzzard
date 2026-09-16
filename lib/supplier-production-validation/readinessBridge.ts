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
 * #339 production capability validation input for #337 readiness evaluator.
 * VALIDATION PASS ≠ READY — createOrder remains UNVERIFIED by design.
 */
export function evaluateProductionValidationChecks(scope: ReadinessScope): ReadinessCheckResult[] {
  const results: ReadinessCheckResult[] = [];
  const validation = getLatestValidationForScope({
    supplierId: scope.supplierId,
    market: scope.market,
    channel: scope.channel,
    environment: scope.environment || "PRODUCTION",
  });

  if (!validation) {
    results.push(block("PRODUCTION_VALIDATION_MISSING", "PRODUCTION", "Production capability validation not run"));
    return results;
  }

  results.push(
    pass("PRODUCTION_VALIDATION_EXISTS", "PRODUCTION", `Validation ${validation.validationId} recorded`)
  );

  if (validation.credentialStatus === "VALID") {
    results.push(pass("PRODUCTION_CREDENTIAL_VALID", "CREDENTIAL", "Production credential validated"));
  } else if (validation.credentialStatus === "NOT_CONFIGURED") {
    results.push(block("PRODUCTION_CREDENTIAL_MISSING", "CREDENTIAL", "Production credential not configured"));
  } else {
    results.push(block("PRODUCTION_CREDENTIAL_BLOCKED", "CREDENTIAL", `Credential status ${validation.credentialStatus}`));
  }

  if (validation.createOrderCapability === "UNVERIFIED") {
    results.push(
      block("REAL_ORDER_ENDPOINT_NOT_VALIDATED", "CAPABILITY", "createOrder capability UNVERIFIED — intentional #339 boundary")
    );
  }

  if (validation.catalogReadStatus === "LIVE_READ_VALIDATED") {
    results.push(pass("PRODUCTION_CATALOG_VALIDATED", "LIVE_READ", "Catalog live-read validated"));
  } else if (validation.catalogReadStatus === "SKIPPED") {
    results.push(warn("PRODUCTION_CATALOG_SKIPPED", "LIVE_READ", "Catalog live-read skipped — LIVE NOT VALIDATED"));
  }

  if (validation.overallStatus === "BLOCKED" || validation.overallStatus === "FAILED") {
    results.push(
      block("PRODUCTION_VALIDATION_BLOCKED", "PRODUCTION", `Validation ${validation.overallStatus}`)
    );
  } else if (validation.overallStatus === "PASSED") {
    results.push(warn("PRODUCTION_VALIDATION_PASSED", "PRODUCTION", "Validation passed but createOrder still UNVERIFIED"));
  }

  return results;
}
