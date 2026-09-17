import { hasUnresolvedCriticalIncidents } from "./incidentAnalysis";
import type { ObservationRecord } from "./types";

export function evaluateObservationRisk(record: ObservationRecord): { level: "PASS" | "FAIL"; blockers: string[] } {
  const blockers: string[] = [];
  if (hasUnresolvedCriticalIncidents(record)) {
    blockers.push("UNRESOLVED_CRITICAL_INCIDENT");
  }
  if (record.metrics.duplicateAttempts > 0) blockers.push("DUPLICATE_SUPPLIER_ORDER");
  if (record.metrics.idempotencyViolations > 0) blockers.push("IDEMPOTENCY_VIOLATION");
  if (record.metrics.securityIncidents > 0) blockers.push("SECURITY_INCIDENT");
  return { level: blockers.length === 0 ? "PASS" : "FAIL", blockers };
}
