/**
 * Part 20 — Operational incident / error readiness (no secret exposure).
 */
const { INCIDENT_LEVEL, INCIDENT_COMPONENT } = require("../../core/adminBackofficeConstants");
const monitoringReadiness = require("./monitoringReadiness");
const operationsControl = require("./operationsControl");
const { listSecurityEvents } = require("../securityLog");

function classifyJobIncidents(operations) {
  const incidents = [];
  const failed = (operations.jobs?.FAILED || 0) + (operations.jobs?.PERMANENTLY_FAILED || 0);
  if (failed > 0) {
    incidents.push({
      level: INCIDENT_LEVEL.WARNING,
      component: INCIDENT_COMPONENT.JOBS,
      code: "jobs_failed",
      message: `${failed} failed job(s) in queue`,
      retryable: true,
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
    component: INCIDENT_COMPONENT.SECURITY,
    code: e.type,
    message: e.detail?.reason || e.type,
    timestamp: e.timestamp,
    retryable: false,
  }));
}

async function getIncidentReadiness() {
  const snapshot = await monitoringReadiness.getMonitoringSnapshot();
  const operations = operationsControl.getOperationsSummary();

  const incidents = [
    ...(snapshot.alerts || []).map((a) => ({
      level: a.level === "CRITICAL" ? INCIDENT_LEVEL.CRITICAL : INCIDENT_LEVEL.WARNING,
      component: a.component,
      code: a.component?.toLowerCase(),
      message: a.reason,
      timestamp: a.timestamp,
      retryable: a.component === "JOBS",
    })),
    ...classifyJobIncidents(operations),
    ...classifySecurityIncidents(),
  ];

  const overall =
    incidents.some((i) => i.level === INCIDENT_LEVEL.CRITICAL)
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
  };
}

module.exports = {
  getIncidentReadiness,
  classifyJobIncidents,
  classifySecurityIncidents,
};
