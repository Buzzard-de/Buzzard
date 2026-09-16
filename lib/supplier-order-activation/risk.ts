import { getReadinessPolicy } from "@/lib/supplier-order-readiness";
import type { SupplierOrderActivationRequest } from "./types";

export function evaluateActivationRisk(activation: SupplierOrderActivationRequest): {
  riskLevel: SupplierOrderActivationRequest["riskLevel"];
  allowed: boolean;
  blockers: string[];
} {
  const policy = getReadinessPolicy();
  const riskLevel = activation.riskLevel;
  const blockers: string[] = [];

  if (riskLevel === "CRITICAL") {
    blockers.push("RISK_CRITICAL");
  } else if (riskLevel === "HIGH" && policy.maxSingleSupplierOrderValue < 10000) {
    blockers.push("RISK_HIGH_REQUIRES_APPROVAL");
  }

  return {
    riskLevel,
    allowed: blockers.length === 0,
    blockers,
  };
}
