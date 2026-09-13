import { getSupplierHealth } from "@/lib/supplier-engine/health";
import { filterIncidents } from "@/lib/fulfillment-control-tower";
import type { ReadinessCheckResult, ReadinessScope, RiskLevel } from "./types";

export function computeRiskClassification(
  scope: ReadinessScope,
  checks: ReadinessCheckResult[]
): RiskLevel {
  if (checks.some((c) => c.blocking && (c.level === "CRITICAL" || c.level === "BLOCKED"))) {
    return "BLOCKED";
  }

  let score = 0;
  const health = getSupplierHealth(scope.supplierId);
  if (health?.healthStatus === "UNHEALTHY") score += 3;
  else if (health?.healthStatus === "DEGRADED") score += 2;
  else if (health?.healthStatus === "UNKNOWN") score += 1;

  const criticalIncidents = filterIncidents({
    supplierId: scope.supplierId,
    status: "OPEN",
    severity: "CRITICAL",
  }).length;
  score += criticalIncidents * 2;

  if (checks.some((c) => c.level === "WARNING")) score += 1;
  if (scope.channel !== "DIRECT") score += 1;
  if (scope.market !== "DE") score += 1;

  if (score >= 5) return "HIGH";
  if (score >= 2) return "MEDIUM";
  return "LOW";
}
