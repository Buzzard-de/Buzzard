import { randomUUID } from "crypto";
import { buildIncidentFingerprint } from "@/lib/fulfillment-control-tower/incidents";
import type { ObservationIncident, ObservationRecord } from "./types";

export function recordCriticalIncident(
  record: ObservationRecord,
  input: { category: string; code: string; orderId?: string; severity?: ObservationIncident["severity"] },
): ObservationIncident {
  const fingerprint = buildIncidentFingerprint(record.observationId, input.category as never, input.code);
  const existing = record.incidents.find((i) => i.fingerprint === fingerprint && i.status === "OPEN");
  if (existing) return existing;

  const incident: ObservationIncident = {
    incidentId: `obsinc_${randomUUID().slice(0, 12)}`,
    fingerprint,
    supplierId: record.supplier,
    category: input.category,
    code: input.code,
    severity: input.severity || "CRITICAL",
    orderId: input.orderId,
    status: "OPEN",
    detectedAt: new Date().toISOString(),
  };
  record.incidents.push(incident);
  record.metrics.criticalIncidents = record.incidents.filter(
    (i) => i.status === "OPEN" && i.severity === "CRITICAL",
  ).length;
  return incident;
}

export function hasUnresolvedCriticalIncidents(record: ObservationRecord): boolean {
  return record.incidents.some((i) => i.status === "OPEN" && i.severity === "CRITICAL");
}
