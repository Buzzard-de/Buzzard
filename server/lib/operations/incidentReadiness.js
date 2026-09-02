/**
 * Part 20/21 — Operational incident readiness (no secret exposure).
 * Part 21 extends with severity, category, correlation, occurrence tracking.
 */
const { INCIDENT_LEVEL, INCIDENT_COMPONENT } = require("../../core/adminBackofficeConstants");
const {
  INCIDENT_CATEGORY,
  INCIDENT_RESOLUTION,
} = require("../../core/securityObservabilityConstants");
const monitoringReadiness = require("./monitoringReadiness");
const operationsControl = require("./operationsControl");
const { listSecurityEvents } = require("../securityLog");

function mapComponentToCategory(component) {
  const map = {
    [INCIDENT_COMPONENT.SECURITY]: INCIDENT_CATEGORY.SECURITY,
    [INCIDENT_COMPONENT.JOBS]: INCIDENT_CATEGORY.OPERATIONS,
    [INCIDENT_COMPONENT.CONFIG]: INCIDENT_CATEGORY.CONFIG,
    DB: INCIDENT_CATEGORY.INFRASTRUCTURE,
    BACKUP: INCIDENT_CATEGORY.BACKUP,
    SALES: INCIDENT_CATEGORY.CONFIG,
    GO_LIVE_LOCK: INCIDENT_CATEGORY.CONFIG,
    PAYMENTS: INCIDENT_CATEGORY.PAYMENTS,
    SUPPLIER: INCIDENT_CATEGORY.SUPPLIER,
  };
  return map[component] || INCIDENT_CATEGORY.OPERATIONS;
}

function classifyJobIncidents(operations) {
  const incidents = [];
  const failed = (operations.jobs?.FAILED || 0) + (operations.jobs?.PERMANENTLY_FAILED || 0);
  if (failed > 0) {
    incidents.push({
      level: INCIDENT_LEVEL.WARNING,
      severity: INCIDENT_LEVEL.WARNING,
      category: INCIDENT_CATEGORY.OPERATIONS,
      component: INCIDENT_COMPONENT.JOBS,
      code: "jobs_failed",
      message: `${failed} failed job(s) in queue`,
      timestamp: new Date().toISOString(),
      retryable: true,
      resolutionState: INCIDENT_RESOLUTION.OPEN,
    });
  }
  return incidents;
}

function classifySecurityIncidents(limit = 20) {
  const events = listSecurityEvents(limit).filter(
    (e) => e.success === false && ["CRITICAL", "HIGH"].includes(String(e.severity || "").toUpperCase())
  );
  return events.slice(0, 10).map((e) => ({
    level: e.severity === "CRITICAL" ? INCIDENT_LEVEL.CRITICAL : INCIDENT_LEVEL.WARNING,
    severity: e.severity === "CRITICAL" ? INCIDENT_LEVEL.CRITICAL : INCIDENT_LEVEL.WARNING,
    category: INCIDENT_CATEGORY.SECURITY,
    component: INCIDENT_COMPONENT.SECURITY,
    code: e.type,
    message: e.detail?.reason || e.type,
    timestamp: e.timestamp,
    correlationId: e.detail?.correlationId || e.detail?.requestId || null,
    retryable: false,
    resolutionState: INCIDENT_RESOLUTION.OPEN,
  }));
}

function enrichIncidents(rawIncidents) {
  const grouped = new Map();

  for (const incident of rawIncidents) {
    const key = `${incident.component || "unknown"}:${incident.code || incident.message}`;
    const ts = incident.timestamp || new Date().toISOString();
    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, {
        ...incident,
        severity: incident.severity || incident.level,
        category: incident.category || mapComponentToCategory(incident.component),
        correlationId: incident.correlationId || null,
        firstDetected: ts,
        lastDetected: ts,
        occurrenceCount: 1,
        resolutionState: incident.resolutionState || INCIDENT_RESOLUTION.OPEN,
      });
      continue;
    }
    existing.occurrenceCount += 1;
    if (new Date(ts).getTime() < new Date(existing.firstDetected).getTime()) {
      existing.firstDetected = ts;
    }
    if (new Date(ts).getTime() > new Date(existing.lastDetected).getTime()) {
      existing.lastDetected = ts;
    }
    if (!existing.correlationId && incident.correlationId) {
      existing.correlationId = incident.correlationId;
    }
    if (incident.level === INCIDENT_LEVEL.CRITICAL) {
      existing.level = INCIDENT_LEVEL.CRITICAL;
      existing.severity = INCIDENT_LEVEL.CRITICAL;
    }
  }

  return Array.from(grouped.values()).sort(
    (a, b) => new Date(b.lastDetected).getTime() - new Date(a.lastDetected).getTime()
  );
}

async function getIncidentReadiness() {
  const snapshot = await monitoringReadiness.getMonitoringSnapshot();
  const operations = operationsControl.getOperationsSummary();

  const rawIncidents = [
    ...(snapshot.alerts || []).map((a) => ({
      level: a.level === "CRITICAL" ? INCIDENT_LEVEL.CRITICAL : INCIDENT_LEVEL.WARNING,
      severity: a.level === "CRITICAL" ? INCIDENT_LEVEL.CRITICAL : INCIDENT_LEVEL.WARNING,
      category: mapComponentToCategory(a.component),
      component: a.component,
      code: a.component?.toLowerCase(),
      message: a.reason,
      timestamp: a.timestamp,
      retryable: a.component === "JOBS",
      resolutionState: INCIDENT_RESOLUTION.OPEN,
    })),
    ...classifyJobIncidents(operations),
    ...classifySecurityIncidents(),
  ];

  const incidents = enrichIncidents(rawIncidents);

  const overall =
    incidents.some((i) => i.level === INCIDENT_LEVEL.CRITICAL || i.severity === INCIDENT_LEVEL.CRITICAL)
      ? "CRITICAL"
      : incidents.length > 0
        ? "WARNING"
        : "OK";

  return {
    overall,
    incidentCount: incidents.length,
    incidents: incidents.slice(0, 25),
    secretsExposed: false,
    failClosed: true,
    enriched: true,
  };
}

module.exports = {
  getIncidentReadiness,
  classifyJobIncidents,
  classifySecurityIncidents,
  enrichIncidents,
  mapComponentToCategory,
};
