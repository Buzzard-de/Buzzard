/**
 * Local operational metrics snapshot.
 * Does not export Prometheus, scrape remote targets, or claim production coverage.
 */

const { getOperationalMetrics } = require("./operationalMetrics");
const { getStoreInfo } = require("../rateLimitStore");

function getLocalMetricsSnapshot(operational) {
  const rateLimit = getStoreInfo();
  const metrics = operational || null;

  return {
    diagnosticOnly: true,
    prometheus: false,
    liveExporter: false,
    productionVerified: false,
    secretsExposed: false,
    rateLimitBackend: rateLimit.backend,
    windowHours: metrics?.windowHours ?? 24,
    requests: metrics?.requests || { rateLimitBackend: rateLimit.backend, rateLimited24h: null },
    errors: metrics?.errors || { securityFailures24h: null, jobFailed: null, monitoringAlerts: null },
    blocked: metrics?.blocked || {},
    retries: metrics?.retries || {},
    database: metrics?.database || { integrity: "UNKNOWN", persistent: null },
    timestamp: new Date().toISOString(),
  };
}

async function collectLocalMetrics() {
  const operational = await getOperationalMetrics();
  return getLocalMetricsSnapshot(operational);
}

module.exports = {
  getLocalMetricsSnapshot,
  collectLocalMetrics,
};
