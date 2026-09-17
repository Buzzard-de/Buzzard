import { getSupplierHealth } from "@/lib/supplier-engine/health";
import type { CheckLevel } from "./types";

export function evaluateSupplierHealth(supplierId: string): { level: CheckLevel; message: string } {
  const health = getSupplierHealth(supplierId);
  if (health.healthStatus === "HEALTHY") {
    return { level: "PASS", message: `HEALTHY latency=${health.responseTimeMs ?? "n/a"}ms` };
  }
  if (health.healthStatus === "DEGRADED") {
    return { level: "REVIEW_REQUIRED", message: "DEGRADED" };
  }
  if (health.healthStatus === "UNHEALTHY") {
    return { level: "FAIL", message: "UNHEALTHY" };
  }
  return { level: "UNVERIFIED", message: health.healthStatus || "UNKNOWN" };
}
