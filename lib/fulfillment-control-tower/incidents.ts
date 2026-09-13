import { randomUUID } from "crypto";
import type {
  FulfillmentIncident,
  IncidentCategory,
  IncidentSeverity,
  IncidentStatus,
  ReconciliationFinding,
  ReconciliationLevel,
} from "./types";
import { saveIncidentRecord, getIncidentByFingerprint, listIncidents, updateIncidentRecord } from "./persistence";

function levelToSeverity(level: ReconciliationLevel): IncidentSeverity {
  if (level === "CRITICAL") return "CRITICAL";
  if (level === "MISMATCH") return "MISMATCH";
  if (level === "WARNING") return "WARNING";
  return "INFO";
}

export function buildIncidentFingerprint(
  fulfillmentId: string,
  category: IncidentCategory,
  code: string
): string {
  return `${fulfillmentId}:${category}:${code}`;
}

export function upsertIncidentFromFinding(input: {
  fulfillmentId: string;
  orderId: string;
  supplierId: string;
  finding: ReconciliationFinding;
  correlationId?: string;
}): { created: boolean; incident: FulfillmentIncident | null } {
  if (input.finding.level === "PASS") {
    return { created: false, incident: null };
  }

  const fingerprint = buildIncidentFingerprint(
    input.fulfillmentId,
    input.finding.category,
    input.finding.code
  );
  const existing = getIncidentByFingerprint(fingerprint);
  const now = new Date().toISOString();

  if (existing && existing.status !== "RESOLVED") {
    return { created: false, incident: existing };
  }

  const incident: FulfillmentIncident = {
    incidentId: existing?.incidentId || `inc_${randomUUID().slice(0, 12)}`,
    fingerprint,
    fulfillmentId: input.fulfillmentId,
    orderId: input.orderId,
    supplierId: input.supplierId,
    severity: levelToSeverity(input.finding.level),
    category: input.finding.category,
    code: input.finding.code,
    message: input.finding.message,
    detectedAt: existing?.detectedAt || now,
    status: "OPEN",
    correlationId: input.correlationId,
  };

  saveIncidentRecord(incident);
  return { created: !existing, incident };
}

export function resolveOpenIncidentsForFulfillment(
  fulfillmentId: string,
  activeFingerprints: Set<string>
): number {
  let resolved = 0;
  for (const incident of listIncidents()) {
    if (incident.fulfillmentId !== fulfillmentId) continue;
    if (incident.status === "RESOLVED") continue;
    if (activeFingerprints.has(incident.fingerprint)) continue;
    updateIncidentRecord({
      ...incident,
      status: "RESOLVED",
      resolvedAt: new Date().toISOString(),
      resolutionNote: "Auto-resolved — reconciliation no longer detects issue",
      resolutionActor: "control-tower",
    });
    resolved++;
  }
  return resolved;
}

export function acknowledgeIncident(incidentId: string, actor: string): FulfillmentIncident | null {
  const incident = listIncidents().find((i) => i.incidentId === incidentId);
  if (!incident) return null;
  const updated: FulfillmentIncident = {
    ...incident,
    status: "ACKNOWLEDGED",
    acknowledgedAt: new Date().toISOString(),
    acknowledgedBy: actor,
  };
  updateIncidentRecord(updated);
  return updated;
}

export function resolveIncident(
  incidentId: string,
  actor: string,
  note?: string
): FulfillmentIncident | null {
  const incident = listIncidents().find((i) => i.incidentId === incidentId);
  if (!incident) return null;
  const updated: FulfillmentIncident = {
    ...incident,
    status: "RESOLVED",
    resolvedAt: new Date().toISOString(),
    resolutionActor: actor,
    resolutionNote: note || "Manually resolved — underlying SSOT unchanged",
  };
  updateIncidentRecord(updated);
  return updated;
}

export function filterIncidents(filter?: {
  supplierId?: string;
  orderId?: string;
  severity?: IncidentSeverity;
  category?: IncidentCategory;
  status?: IncidentStatus;
}): FulfillmentIncident[] {
  return listIncidents().filter((incident) => {
    if (filter?.supplierId && incident.supplierId !== filter.supplierId) return false;
    if (filter?.orderId && incident.orderId !== filter.orderId) return false;
    if (filter?.severity && incident.severity !== filter.severity) return false;
    if (filter?.category && incident.category !== filter.category) return false;
    if (filter?.status && incident.status !== filter.status) return false;
    return true;
  });
}
