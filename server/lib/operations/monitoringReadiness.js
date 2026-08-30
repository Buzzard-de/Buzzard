/**
 * Part 17 — Monitoring and alert readiness aggregation.
 */
const productionHealth = require("../productionHealth");
const operationsControl = require("./operationsControl");
const { validateConfiguration } = require("./configurationValidation");
const backupAutomation = require("../backupAutomation");
const { evaluateGoLiveReadiness } = require("./goLiveReadiness");

async function getMonitoringSnapshot() {
  const [production, goLive] = await Promise.all([
    productionHealth.getProductionSummary(),
    evaluateGoLiveReadiness(),
  ]);

  const config = validateConfiguration();
  const backup = backupAutomation.getBackupReadiness();
  const operations = operationsControl.getOperationsSummary();

  const alerts = [];

  if (production.database?.integrity?.status === "FAILED") {
    alerts.push({ level: "CRITICAL", component: "DB", reason: "integrity check failed", timestamp: production.timestamp });
  }
  if (!backup.latestValid && backup.dirExists) {
    alerts.push({ level: "WARNING", component: "BACKUP", reason: backup.latestStatus || "no valid backup", timestamp: production.timestamp });
  }
  if (!config.ok) {
    alerts.push({ level: "CRITICAL", component: "CONFIG", reason: config.errors[0]?.message, timestamp: config.timestamp });
  }
  if (production.commerce?.salesEnabled) {
    alerts.push({ level: "CRITICAL", component: "SALES", reason: "Sales enabled unexpectedly", timestamp: production.timestamp });
  }
  if (!production.goLiveLock) {
    alerts.push({ level: "CRITICAL", component: "GO_LIVE_LOCK", reason: "Go-live lock inactive", timestamp: production.timestamp });
  }
  if ((operations.jobs?.FAILED || 0) + (operations.jobs?.PERMANENTLY_FAILED || 0) > 0) {
    alerts.push({ level: "WARNING", component: "JOBS", reason: "Failed jobs in queue", timestamp: production.timestamp });
  }

  return {
    timestamp: new Date().toISOString(),
    overall: production.overall,
    components: {
      db: { status: production.database?.integrity?.status, persistent: production.database?.persistence?.persistent },
      backup: { status: backup.latestStatus, dir: backup.backupDir },
      workers: production.worker,
      jobs: operations.jobs,
      catalog: production.catalog,
      supplier: production.supplierIntegration,
      redis: production.redis,
      payments: {
        salesEnabled: production.commerce?.salesEnabled,
        mockPaymentOnly: production.commerce?.mockPaymentOnly,
        stripe: production.commerce?.stripeEnabled,
        paypal: production.commerce?.paypalEnabled,
      },
      goLiveLock: production.goLiveLock,
    },
    goLiveReadiness: goLive.overall,
    alerts,
    secretsExposed: false,
  };
}

module.exports = {
  getMonitoringSnapshot,
};
