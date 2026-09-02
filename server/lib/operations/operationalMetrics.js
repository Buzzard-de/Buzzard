/**
 * Part 21 — Safe operational metrics (no secrets).
 */
const { listSecurityEvents } = require("../securityLog");
const operationsControl = require("./operationsControl");
const monitoringReadiness = require("./monitoringReadiness");
const { getStoreInfo } = require("../rateLimitStore");

function countEventsByType(events, types) {
  const set = new Set(types);
  return events.filter((e) => set.has(e.type)).length;
}

async function getOperationalMetrics() {
  const events = listSecurityEvents(500);
  const operations = operationsControl.getOperationsSummary();
  const monitoring = await monitoringReadiness.getMonitoringSnapshot();
  const rateLimit = getStoreInfo();

  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const recent = events.filter((e) => new Date(e.timestamp).getTime() >= dayAgo);

  return {
    timestamp: new Date().toISOString(),
    diagnosticOnly: true,
    windowHours: 24,
    requests: {
      rateLimitBackend: rateLimit.backend,
      rateLimited24h: countEventsByType(recent, ["api_rate_limited", "admin_login_rate_limited", "auth_login_rate_limited"]),
    },
    errors: {
      securityFailures24h: recent.filter((e) => e.success === false).length,
      jobFailed: (operations.jobs?.FAILED || 0) + (operations.jobs?.PERMANENTLY_FAILED || 0),
      monitoringAlerts: monitoring.alerts?.length || 0,
    },
    blocked: {
      commercialOrders24h: countEventsByType(recent, ["commercial_order_blocked", "order_creation_blocked", "checkout_blocked"]),
      supplierOrders24h: countEventsByType(recent, ["supplier_order_blocked"]),
      paymentAttempts24h: countEventsByType(recent, ["payment_attempt_blocked"]),
      adminActions24h: countEventsByType(recent, ["go_live_blocked", "commerce_permission_denied"]),
      unauthorized24h: countEventsByType(recent, ["permission_denied", "privilege_escalation_attempt", "csrf_failure", "idor_attempt"]),
    },
    retries: {
      jobRetrying: operations.jobs?.RETRYING || 0,
    },
    readiness: {
      monitoringOverall: monitoring.overall,
      alertCount: monitoring.alerts?.length || 0,
    },
    worker: monitoring.components?.workers || null,
    database: {
      integrity: monitoring.components?.db?.status || "UNKNOWN",
      persistent: monitoring.components?.db?.persistent ?? null,
    },
    apiHealth: monitoring.overall,
    secretsExposed: false,
  };
}

module.exports = {
  getOperationalMetrics,
};
