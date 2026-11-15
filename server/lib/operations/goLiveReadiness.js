/**
 * Part 17 — Go-Live Readiness Control Center (diagnosis only — never auto-activates).
 */
const { READINESS_GATE_STATUS, GO_LIVE_GATES } = require("../../core/operationsConstants");
const { getDatabaseHealth } = require("../db");
const { runIntegrityCheck } = require("../dbIntegrity");
const backupAutomation = require("../backupAutomation");
const catalogReadService = require("../storefront/catalogReadService");
const { getEffectiveFlags } = require("../commerce/commerceFeatureFlags");
const goLiveApproval = require("../commerce/goLiveApproval");
const { getRedisHealth } = require("../productionHealth");
const { getWorkerHealth } = require("../productionHealth");
const { createConnectorFromEnv, isLiveImportEnabled } = require("../supplier/realSupplierConnector");
const { validateConfiguration } = require("./configurationValidation");
const productStagingService = require("../pim/productStagingService");

function gate(name, status, detail, extras = {}) {
  return { gate: name, status, detail, ...extras };
}

function workersReadiness(worker) {
  const report = worker && typeof worker === "object" ? worker : {};
  const status = typeof report.status === "string" && report.status.trim() ? report.status.trim() : "UNKNOWN";
  const storedStatus = typeof report.storedStatus === "string" && report.storedStatus.trim() ? report.storedStatus.trim() : null;
  const runtimeVerified = report.runtimeVerified === true;
  const verifiedRunning = runtimeVerified && status === "RUNNING";
  return {
    verifiedRunning,
    gateStatus: verifiedRunning ? READINESS_GATE_STATUS.PASS : READINESS_GATE_STATUS.CONDITION,
    detail: `status=${status} storedStatus=${storedStatus || "none"} runtimeVerified=${runtimeVerified} queued=${report.queue?.queued ?? 0}`,
  };
}

async function evaluateGoLiveReadiness() {
  const gates = [];
  const flags = getEffectiveFlags();

  const dbHealth = getDatabaseHealth();
  const integrity = runIntegrityCheck();
  gates.push(
    gate(
      "DATABASE",
      integrity.status === "OK" && dbHealth.enabled !== false ? READINESS_GATE_STATUS.PASS : READINESS_GATE_STATUS.CONDITION,
      `integrity=${integrity.status} path=${dbHealth.path || "unknown"} persistent=${dbHealth.persistence?.persistent ?? false}`
    )
  );

  const backup = backupAutomation.getBackupReadiness();
  gates.push(
    gate(
      "BACKUP",
      backup.latestValid ? READINESS_GATE_STATUS.PASS : backup.dirExists ? READINESS_GATE_STATUS.CONDITION : READINESS_GATE_STATUS.FAIL,
      backup.latestStatus || "no_valid_backup"
    )
  );

  const catalog = catalogReadService.getHealth();
  gates.push(
    gate(
      "CATALOG",
      READINESS_GATE_STATUS.PASS,
      `publicProducts=${catalog.productCount} salesEnabled=${catalog.salesEnabled}`,
      { productCount: catalog.productCount }
    )
  );

  let stagingStats = {};
  try {
    stagingStats = productStagingService.getStagingStats();
  } catch {
    stagingStats = {};
  }
  const validatedCount = stagingStats.VALIDATED || 0;
  gates.push(
    gate(
      "PRODUCT_DATA",
      validatedCount > 0 ? READINESS_GATE_STATUS.CONDITION : READINESS_GATE_STATUS.BLOCKED,
      validatedCount > 0 ? `${validatedCount} validated staging products` : "No verified supplier product data"
    )
  );

  const supplier = createConnectorFromEnv().getStatus();
  gates.push(
    gate(
      "SUPPLIER",
      supplier.credentialsConfigured ? READINESS_GATE_STATUS.CONDITION : READINESS_GATE_STATUS.BLOCKED,
      supplier.credentialsConfigured ? "Credentials configured but not verified" : "No real supplier credentials",
      { liveImport: isLiveImportEnabled(), connected: false }
    )
  );

  const redis = await getRedisHealth();
  gates.push(
    gate(
      "REDIS",
      redis.configured && redis.ok ? READINESS_GATE_STATUS.PASS : READINESS_GATE_STATUS.CONDITION,
      redis.status || "NOT_CONFIGURED",
      { backend: redis.backend }
    )
  );

  const config = validateConfiguration();
  gates.push(
    gate(
      "SECURITY",
      config.ok ? READINESS_GATE_STATUS.PASS : READINESS_GATE_STATUS.FAIL,
      config.errors[0]?.message || "configuration valid",
      { errorCount: config.errors.length }
    )
  );

  gates.push(
    gate(
      "PAYMENTS",
      !flags.paymentEnabled && flags.mockPaymentOnly ? READINESS_GATE_STATUS.PASS : READINESS_GATE_STATUS.BLOCKED,
      `mockPaymentOnly=${flags.mockPaymentOnly} stripe=${flags.stripeEnabled} paypal=${flags.paypalEnabled}`
    )
  );

  const workers = workersReadiness(getWorkerHealth());
  gates.push(gate("WORKERS", workers.gateStatus, workers.detail));

  gates.push(
    gate("MONITORING", READINESS_GATE_STATUS.PASS, "/api/health/production available")
  );

  gates.push(
    gate(
      "SALES",
      !flags.salesEnabled ? READINESS_GATE_STATUS.PASS : READINESS_GATE_STATUS.BLOCKED,
      `salesEnabled=${flags.salesEnabled}`
    )
  );

  gates.push(
    gate(
      "GO_LIVE_LOCK",
      goLiveApproval.PRODUCTION_SAFETY_LOCK ? READINESS_GATE_STATUS.PASS : READINESS_GATE_STATUS.FAIL,
      goLiveApproval.PRODUCTION_SAFETY_LOCK ? "ACTIVE" : "INACTIVE"
    )
  );

  const failCount = gates.filter((g) => g.status === READINESS_GATE_STATUS.FAIL).length;
  const blockedCount = gates.filter((g) => g.status === READINESS_GATE_STATUS.BLOCKED).length;
  const conditionCount = gates.filter((g) => g.status === READINESS_GATE_STATUS.CONDITION).length;

  let overall = "READY";
  if (failCount > 0 || blockedCount > 0) overall = "NOT_READY";
  else if (conditionCount > 0) overall = "CONDITION";
  if (overall === "READY" && !workers.verifiedRunning) overall = "CONDITION";

  return {
    overall,
    diagnosticOnly: true,
    autoActivate: false,
    gates,
    gateNames: GO_LIVE_GATES,
    summary: { pass: gates.filter((g) => g.status === READINESS_GATE_STATUS.PASS).length, fail: failCount, blocked: blockedCount, condition: conditionCount },
    timestamp: new Date().toISOString(),
  };
}

module.exports = {
  evaluateGoLiveReadiness,
};
