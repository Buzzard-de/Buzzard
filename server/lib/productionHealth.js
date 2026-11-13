/**
 * Part 13 — Production health aggregation (no secrets)
 */
const { getDatabaseHealth } = require("./db");
const { getDatabaseStartupStatus } = require("./dbStartup");
const { runIntegrityCheck } = require("./dbIntegrity");
const { getDeploymentIdentity, getDeploymentDrift } = require("./deploymentIdentity");
const { validateEnvironment } = require("./environmentValidation");
const { getStoreInfo } = require("./rateLimitStore");
const { isSalesEnabled } = require("./salesMode");
const goLiveApproval = require("./commerce/goLiveApproval");

async function getRedisHealth() {
  const redisClient = require("./redisClient");
  const configured = redisClient.isConfigured();
  const storeInfo = getStoreInfo();
  const base = {
    configured,
    backend: storeInfo.backend,
    configuredStore: storeInfo.configured,
    fallbackFrom: storeInfo.fallbackFrom || null,
    disabled: storeInfo.disabled || false,
  };

  if (!configured || storeInfo.backend !== "redis") {
    return { ...base, ok: storeInfo.backend !== "redis" || !configured, status: configured ? "FALLBACK" : "NOT_CONFIGURED" };
  }

  try {
    const health = await redisClient.healthCheck();
    return {
      ...base,
      ok: health.ok,
      status: health.ok ? "OK" : "FAILED",
      latencyMs: health.latencyMs,
      error: health.error,
    };
  } catch (err) {
    return { ...base, ok: false, status: "FAILED", error: err.message };
  }
}

function configurationIntent(name) {
  const requested = Object.prototype.hasOwnProperty.call(process.env, name) ? process.env[name] : null;
  return { requested, autoStart: false, honored: false };
}

function readWorkerRuntime() {
  const jobWorker = require("./jobWorker");
  const state = jobWorker.getWorkerState() || {};
  const storedStatus = typeof state.status === "string" ? state.status : null;
  const verified = storedStatus === "STOPPED" || storedStatus === "PAUSED";
  return {
    status: verified ? storedStatus : "UNKNOWN",
    runtimeVerified: verified,
    storedStatus,
    workerId: state.workerId ?? null,
    jobsProcessed: state.jobsProcessed ?? null,
    lastTickAt: state.lastTickAt ?? null,
  };
}

function readQueueCounts() {
  const { db } = require("./db");
  const count = (sql) => db.prepare(sql).get().n;
  return {
    queued: count("SELECT COUNT(*) n FROM core_background_jobs WHERE status IN ('QUEUED','RETRYING','queued','retrying')"),
    failed: count("SELECT COUNT(*) n FROM core_background_jobs WHERE status IN ('FAILED','failed')"),
    deadLetter: count("SELECT COUNT(*) n FROM core_background_jobs WHERE status IN ('DEAD_LETTER','dead_letter')"),
  };
}

function getWorkerHealth() {
  const report = {
    enabled: false,
    autoStart: false,
    status: "UNKNOWN",
    runtimeVerified: false,
    storedStatus: null,
    configurationIntent: configurationIntent("BUZZARD_WORKER_ENABLED"),
    workerId: null,
    jobsProcessed: null,
    lastTickAt: null,
    queue: null,
    supplierOrdersBlocked: !isSalesEnabled(),
  };
  try {
    Object.assign(report, readWorkerRuntime());
  } catch (err) {
    report.status = "UNKNOWN";
    report.runtimeVerified = false;
    report.error = err.message;
  }
  try {
    report.queue = readQueueCounts();
  } catch (err) {
    report.queue = null;
    report.queueError = err.message;
  }
  if (report.status === "RUNNING") report.status = "UNKNOWN";
  return report;
}

function getSchedulerHealth() {
  const report = {
    enabled: false,
    autoStart: false,
    status: "UNKNOWN",
    runtimeVerified: false,
    configurationIntent: configurationIntent("BUZZARD_SCHEDULER_ENABLED"),
    total: null,
    enabledCount: null,
    nextRuns: [],
  };
  try {
    const { listSchedules } = require("./jobScheduler");
    const schedules = listSchedules({ limit: 100 }) || [];
    const enabledRows = schedules.filter((s) => s.enabled);
    report.total = schedules.length;
    report.enabledCount = enabledRows.length;
    report.nextRuns = enabledRows
      .filter((s) => s.nextRunAt)
      .slice(0, 5)
      .map((s) => ({ id: s.id, name: s.name, nextRunAt: s.nextRunAt }));
  } catch (err) {
    report.status = "UNKNOWN";
    report.error = err.message;
  }
  return report;
}

async function getAiHealthSummary() {
  try {
    const { getOrchestratorStatus } = require("./orchestratorBridge");
    const { getGuardianStatus } = require("./guardianBridge");
    const orchestrator = await getOrchestratorStatus();
    const guardian = await getGuardianStatus();
    const { db } = require("./db");
    const employees = db.prepare("SELECT COUNT(*) n FROM core_ai_employees").get().n;
    const pendingTasks = db
      .prepare("SELECT COUNT(*) n FROM core_ai_tasks WHERE status IN ('PENDING','RUNNING','pending','running')")
      .get().n;
    return {
      employees,
      pendingTasks,
      orchestrator: {
        configured: orchestrator.configured,
        reachable: orchestrator.reachable,
        status: orchestrator.reachable ? "ONLINE" : orchestrator.configured ? "WARNING" : "UNKNOWN",
      },
      guardian: {
        configured: guardian.configured,
        reachable: guardian.reachable,
        status: guardian.reachable ? "ONLINE" : guardian.configured ? "WARNING" : "UNKNOWN",
      },
      provider: process.env.AI_PROVIDER || "rules",
    };
  } catch (err) {
    return { error: err.message };
  }
}

function getCatalogHealthSummary() {
  try {
    const catalogReadService = require("./storefront/catalogReadService");
    const taxonomy = require("./taxonomyCanonical").validateCanonicalTaxonomy();
    const health = catalogReadService.getHealth();
    return {
      status: health.productCount > 0 ? "OK" : "WARNING",
      productCount: health.productCount,
      cacheEntries: health.cache?.entries,
      taxonomy: { ok: taxonomy.ok, count: taxonomy.count },
    };
  } catch (err) {
    return { status: "ERROR", error: err.message };
  }
}

function getSupplierIntegrationHealth() {
  try {
    const { createConnectorFromEnv, isLiveImportEnabled } = require("./supplier/realSupplierConnector");
    const connector = createConnectorFromEnv();
    const status = connector.getStatus();
    return {
      connected: false,
      liveImportEnabled: isLiveImportEnabled(),
      dryRun: status.dryRun !== false,
      credentialsConfigured: status.credentialsConfigured,
      testOnlySupplier: status.testOnlySupplier,
      canConnectLive: status.canConnectLive,
      blockedReason: status.blockedReason,
      adapterMode: "MOCK",
      note: "No real supplier connected — Part 15/16 scaffold only",
    };
  } catch (err) {
    return { connected: false, error: err.message };
  }
}

function getBackupHealthSummary() {
  try {
    const backupAutomation = require("./backupAutomation");
    return backupAutomation.getBackupReadiness();
  } catch (err) {
    return { error: err.message };
  }
}

function getCommerceHealthSummary() {
  try {
    const { getEffectiveFlags } = require("./commerce/commerceFeatureFlags");
    const flags = getEffectiveFlags();
    return {
      salesEnabled: flags.salesEnabled,
      checkoutDryRunOnly: flags.checkoutDryRunOnly,
      mockPaymentOnly: flags.mockPaymentOnly,
      supplierOrdersEnabled: flags.supplierOrdersEnabled,
      stripeEnabled: flags.stripeEnabled,
      paypalEnabled: flags.paypalEnabled,
      goLiveLock: goLiveApproval.PRODUCTION_SAFETY_LOCK,
      violations: flags.violations?.length || 0,
    };
  } catch (err) {
    return { error: err.message };
  }
}

async function getProductionSummary() {
  const identity = getDeploymentIdentity();
  const drift = getDeploymentDrift();
  const envValidation = validateEnvironment();
  const dbHealth = getDatabaseHealth();
  const dbStartup = getDatabaseStartupStatus();
  const integrity = runIntegrityCheck();
  const redis = await getRedisHealth();
  const worker = getWorkerHealth();
  const scheduler = getSchedulerHealth();
  const ai = await getAiHealthSummary();
  const catalog = getCatalogHealthSummary();
  const commerce = getCommerceHealthSummary();
  const supplierIntegration = getSupplierIntegrationHealth();
  const backup = getBackupHealthSummary();
  let jobSafety = {};
  try {
    jobSafety = require("./jobSafetyGate").getJobSafetyStatus();
  } catch (err) {
    jobSafety = { error: err.message };
  }

  let overall = "OK";
  if (integrity.status === "FAILED" || !envValidation.ok) overall = "FAILED";
  else if (drift.status === "DEPLOYMENT_DRIFT" || integrity.status === "DEGRADED") overall = "DEGRADED";
  else if (dbStartup.warnings?.length || envValidation.warnings?.length) overall = "WARNING";

  return {
    overall,
    version: identity,
    deployment: drift,
    environment: envValidation,
    database: {
      ...dbHealth,
      startup: dbStartup,
      integrity,
    },
    redis,
    worker,
    scheduler,
    ai,
    catalog,
    commerce,
    supplierIntegration,
    backup,
    jobSafety,
    salesEnabled: isSalesEnabled(),
    goLiveLock: goLiveApproval.PRODUCTION_SAFETY_LOCK,
    timestamp: new Date().toISOString(),
  };
}

function getVersionPayload() {
  const identity = getDeploymentIdentity();
  return {
    service: identity.service,
    environment: identity.environment,
    commit: identity.commit,
    branch: identity.branch,
    buildTime: identity.buildTime,
    version: identity.version,
    salesEnabled: identity.salesEnabled,
  };
}

module.exports = {
  getProductionSummary,
  getVersionPayload,
  getRedisHealth,
  getWorkerHealth,
  getSchedulerHealth,
  getAiHealthSummary,
  getCatalogHealthSummary,
  getCommerceHealthSummary,
  getSupplierIntegrationHealth,
  getBackupHealthSummary,
};
