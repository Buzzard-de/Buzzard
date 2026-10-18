/**
 * Part 13 — Production health aggregation (no secrets)
 */
const { getDatabaseHealth, toPublicDatabaseHealth } = require("./db");
const { getDatabaseStartupStatus } = require("./dbStartup");
const { runIntegrityCheck } = require("./dbIntegrity");
const { getDeploymentIdentity, getDeploymentDrift } = require("./deploymentIdentity");
const { validateEnvironment } = require("./environmentValidation");
const { getStoreInfo } = require("./rateLimitStore");
const { isSalesEnabled } = require("./salesMode");
const goLiveApproval = require("./commerce/goLiveApproval");

const SAFE_PROBE_ERROR = /^[A-Za-z0-9._:-]{1,64}$/;

function logProbeFailure(probe, err) {
  console.error("[productionHealth]", probe, {
    name: err?.name || "Error",
    code: typeof err?.code === "string" ? err.code : undefined,
  });
}

function probeFailure(probe, err, extra = {}) {
  logProbeFailure(probe, err);
  return { ...extra, errorKey: `health.${probe}Failed` };
}

function publicProbeError(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return SAFE_PROBE_ERROR.test(text) ? text : "health.probeFailed";
}

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
      error: publicProbeError(health.error),
    };
  } catch (err) {
    return probeFailure("redis", err, { ...base, ok: false, status: "FAILED" });
  }
}

function getWorkerHealth() {
  try {
    const jobWorker = require("./jobWorker");
    const state = jobWorker.getWorkerState();
    const { db } = require("./db");
    const queued = db
      .prepare("SELECT COUNT(*) n FROM core_background_jobs WHERE status IN ('QUEUED','RETRYING','queued','retrying')")
      .get().n;
    const failed = db
      .prepare("SELECT COUNT(*) n FROM core_background_jobs WHERE status IN ('FAILED','failed')")
      .get().n;
    const deadLetter = db
      .prepare("SELECT COUNT(*) n FROM core_background_jobs WHERE status IN ('DEAD_LETTER','dead_letter')")
      .get().n;
    return {
      enabled: process.env.BUZZARD_WORKER_ENABLED !== "0",
      status: state.status,
      workerId: state.workerId,
      jobsProcessed: state.jobsProcessed,
      lastTickAt: state.lastTickAt,
      queue: { queued, failed, deadLetter },
      supplierOrdersBlocked: !isSalesEnabled(),
    };
  } catch (err) {
    return probeFailure("worker", err, { enabled: false, status: "ERROR" });
  }
}

function getSchedulerHealth() {
  try {
    const { listSchedules } = require("./jobScheduler");
    const schedules = listSchedules({ limit: 100 });
    const enabled = schedules.filter((s) => s.enabled).length;
    return {
      enabled: true,
      total: schedules.length,
      enabledCount: enabled,
      nextRuns: schedules
        .filter((s) => s.enabled && s.nextRunAt)
        .slice(0, 5)
        .map((s) => ({ id: s.id, name: s.name, nextRunAt: s.nextRunAt })),
    };
  } catch (err) {
    return probeFailure("scheduler", err, { enabled: false });
  }
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
    return probeFailure("ai", err);
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
    return probeFailure("catalog", err, { status: "ERROR" });
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
    return probeFailure("supplier", err, { connected: false });
  }
}

function getBackupHealthSummary() {
  try {
    const backupAutomation = require("./backupAutomation");
    const readiness = backupAutomation.getBackupReadiness();
    const { backupDir: _backupDir, ...publicReady } = readiness;
    return publicReady;
  } catch (err) {
    return probeFailure("backup", err);
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
    return probeFailure("commerce", err);
  }
}

function publicStartup(startup) {
  if (!startup || typeof startup !== "object") return startup;
  return {
    ok: startup.ok,
    message: startup.message,
    errors: startup.errors,
    warnings: startup.warnings,
    validatedAt: startup.validatedAt,
    integrity: startup.integrity,
    persistence: startup.persistence
      ? {
          mode: startup.persistence.mode,
          persistent: startup.persistence.persistent,
          ephemeralRisk: Boolean(startup.persistence.ephemeralRisk),
        }
      : undefined,
    migrated: Boolean(startup.migration),
  };
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
    jobSafety = probeFailure("jobSafety", err);
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
      ...toPublicDatabaseHealth(dbHealth),
      startup: publicStartup(dbStartup),
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
  probeFailure,
  publicProbeError,
};
