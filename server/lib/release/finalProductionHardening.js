/**
 * Part 26 — Final production hardening center (diagnostic only, fail-closed).
 * Reuses Parts 17–25 readiness systems — no parallel stack.
 */
const {
  FINAL_HARDENING_VERSION,
  FINAL_HARDENING_GATE,
  FINAL_GATE_STATUS,
  FINAL_DECISION_STATUS,
  FINAL_HARDENING_POLICY,
} = require("../../core/finalProductionHardeningConstants");
const { READINESS_GATE_STATUS } = require("../../core/operationsConstants");
const configurationValidation = require("../operations/configurationValidation");
const goLiveApproval = require("../commerce/goLiveApproval");
const { getEffectiveFlags } = require("../commerce/commerceFeatureFlags");
const securityReadiness = require("../security/securityReadiness");
const supplierReadinessCenter = require("../supplier/supplierReadinessCenter");
const releaseReadinessCenter = require("./releaseReadinessCenter");
const { evaluateRollbackReadiness } = require("./releaseRollbackReadiness");
const { buildReleaseManifest } = require("./releaseManifest");
const { evaluateReleaseSafety } = require("./releaseSafetyGate");
const monitoringReadiness = require("../operations/monitoringReadiness");
const incidentReadiness = require("../operations/incidentReadiness");
const alertReadiness = require("../operations/alertReadiness");
const backupAutomation = require("../backupAutomation");
const productQualityReadinessCenter = require("../pim/productQualityReadinessCenter");
const catalogReadService = require("../storefront/catalogReadService");
const { createConnectorFromEnv } = require("../supplier/realSupplierConnector");
const { getDeploymentIdentity } = require("../deploymentIdentity");
const operationsControl = require("../operations/operationsControl");
const operationsAudit = require("../operations/operationsAudit");
const { redactSecrets } = require("../supplier/realSupplierConnector");

const FALSE_VALUES = new Set(["0", "false", "off", "disabled"]);

function isFalse(value) {
  return FALSE_VALUES.has(String(value ?? "").trim().toLowerCase());
}

function gate(name, status, detail, extras = {}) {
  return { name, status, detail, ...extras };
}

function mapReadinessStatus(status) {
  if (status === READINESS_GATE_STATUS.PASS || status === "PASS" || status === "READY") {
    return FINAL_GATE_STATUS.PASS;
  }
  if (status === READINESS_GATE_STATUS.FAIL || status === "FAIL" || status === "CRITICAL") {
    return FINAL_GATE_STATUS.FAIL;
  }
  if (status === READINESS_GATE_STATUS.BLOCKED || status === "BLOCKED" || status === "NOT_READY") {
    return FINAL_GATE_STATUS.BLOCKED;
  }
  return FINAL_GATE_STATUS.CONDITION;
}

function evaluateEnvironmentSafety(env = process.env) {
  const checks = {
    salesServer: isFalse(env.BUZZARD_SALES_ENABLED),
    salesPublic: isFalse(env.NEXT_PUBLIC_SALES_ENABLED),
    dryRun: String(env.REAL_SUPPLIER_DRY_RUN ?? "1").trim() === "1",
    liveImportOff: isFalse(env.REAL_SUPPLIER_LIVE_IMPORT),
    safetyLock:
      String(env.PRODUCTION_SAFETY_LOCK ?? "").toLowerCase() === "true" ||
      goLiveApproval.PRODUCTION_SAFETY_LOCK === true,
  };
  const allSafe = Object.values(checks).every(Boolean);
  return {
    checks,
    status: allSafe ? FINAL_GATE_STATUS.PASS : FINAL_GATE_STATUS.BLOCKED,
    detail: allSafe ? "environment safety invariants satisfied" : "unsafe environment variable detected",
  };
}

function computeFinalDecision(gates, flags, connector) {
  const blockedGates = gates.filter(
    (g) => g.status === FINAL_GATE_STATUS.BLOCKED || g.status === FINAL_GATE_STATUS.FAIL
  );
  const goLiveGate = gates.find((g) => g.name === FINAL_HARDENING_GATE.GO_LIVE_APPROVAL);

  if (flags.salesEnabled || flags.stripeEnabled || flags.paypalEnabled) {
    return {
      ready: false,
      status: FINAL_DECISION_STATUS.BLOCKED,
      reason: "commerce or payment activation detected",
      diagnosticOnly: FINAL_HARDENING_POLICY.diagnosticOnly,
      autoActivate: FINAL_HARDENING_POLICY.autoActivate,
      salesEnabled: flags.salesEnabled,
      supplierLive: connector.liveImportEnabled === true,
    };
  }

  if (connector.liveImportEnabled || connector.credentialsConfigured) {
    return {
      ready: false,
      status: FINAL_DECISION_STATUS.BLOCKED,
      reason: connector.liveImportEnabled
        ? "live supplier import enabled"
        : "supplier credentials configured without explicit go-live",
      diagnosticOnly: FINAL_HARDENING_POLICY.diagnosticOnly,
      autoActivate: FINAL_HARDENING_POLICY.autoActivate,
      salesEnabled: false,
      supplierLive: connector.liveImportEnabled === true,
    };
  }

  if (goLiveGate?.status === FINAL_GATE_STATUS.BLOCKED) {
    return {
      ready: false,
      status: FINAL_DECISION_STATUS.BLOCKED,
      reason: "explicit human go-live approval required",
      diagnosticOnly: FINAL_HARDENING_POLICY.diagnosticOnly,
      autoActivate: FINAL_HARDENING_POLICY.autoActivate,
      salesEnabled: false,
      supplierLive: false,
    };
  }

  if (blockedGates.length > 0) {
    return {
      ready: false,
      status: FINAL_DECISION_STATUS.NOT_READY,
      reason: `${blockedGates.length} gate(s) blocked or failed`,
      diagnosticOnly: FINAL_HARDENING_POLICY.diagnosticOnly,
      autoActivate: FINAL_HARDENING_POLICY.autoActivate,
      salesEnabled: false,
      supplierLive: false,
    };
  }

  const conditionGates = gates.filter((g) => g.status === FINAL_GATE_STATUS.CONDITION);
  if (conditionGates.length > 0) {
    return {
      ready: false,
      status: FINAL_DECISION_STATUS.CONDITION,
      reason: `${conditionGates.length} gate(s) in condition state`,
      diagnosticOnly: FINAL_HARDENING_POLICY.diagnosticOnly,
      autoActivate: FINAL_HARDENING_POLICY.autoActivate,
      salesEnabled: false,
      supplierLive: false,
    };
  }

  return {
    ready: false,
    status: FINAL_DECISION_STATUS.NOT_READY,
    reason: "pre-go-live hardening complete but human approval still required",
    diagnosticOnly: FINAL_HARDENING_POLICY.diagnosticOnly,
    autoActivate: FINAL_HARDENING_POLICY.autoActivate,
    salesEnabled: false,
    supplierLive: false,
  };
}

async function evaluateFinalProductionHardening({ adminDetail = false } = {}) {
  const config = configurationValidation.validateConfiguration();
  const flags = getEffectiveFlags();
  const connector = createConnectorFromEnv().getStatus();
  const deployment = getDeploymentIdentity();
  const publicCatalog = catalogReadService.getHealth();
  const envSafety = evaluateEnvironmentSafety();
  const safety = evaluateReleaseSafety(releaseReadinessCenter.buildSafeEnv(), {
    productionSafetyLock: goLiveApproval.PRODUCTION_SAFETY_LOCK,
    supplierOrdersBlocked: !flags.supplierOrdersEnabled,
    stripeEnabled: flags.stripeEnabled,
    paypalEnabled: flags.paypalEnabled,
  });

  const security = securityReadiness.evaluateSecurityReadiness({ adminDetail });
  const securityGates = security.SECURITY_READINESS?.gates || [];
  const supplierReport = supplierReadinessCenter.evaluateSupplierIntegrationReadiness();
  const releaseReport = await releaseReadinessCenter.evaluateProductionReleaseReadiness();
  const monitoring = await monitoringReadiness.getMonitoringSnapshot();
  const incidents = await incidentReadiness.getIncidentReadiness();
  const alerts = await alertReadiness.getAlertReadiness();
  const backup = backupAutomation.getBackupReadiness();
  const productQuality = productQualityReadinessCenter.evaluateProductQualityReadiness();
  const operations = operationsControl.getOperationsSummary();
  const rollback = evaluateRollbackReadiness({
    previousRelease: deployment.commitFull !== "unknown" ? deployment.commitFull : null,
    databaseRollback: true,
    configurationRollback: config.ok,
  });

  const manifest = buildReleaseManifest({
    version: FINAL_HARDENING_VERSION,
    commit: deployment.commitFull || deployment.commit,
  });

  const authGate = securityGates.find((g) => g.gate === "AUTHENTICATION");
  const authzGate = securityGates.find((g) => g.gate === "AUTHORIZATION");
  const apiGate = securityGates.find((g) => g.gate === "API_PROTECTION");

  const gates = [
    gate(
      FINAL_HARDENING_GATE.CONFIGURATION,
      config.ok ? FINAL_GATE_STATUS.PASS : FINAL_GATE_STATUS.BLOCKED,
      config.ok ? "configuration valid" : `errors=${config.errors?.length || 0}`,
      { errorCount: config.errors?.length || 0, warningCount: config.warnings?.length || 0 }
    ),
    gate(
      FINAL_HARDENING_GATE.AUTHENTICATION,
      mapReadinessStatus(authGate?.status),
      authGate?.detail || "admin authentication stack"
    ),
    gate(
      FINAL_HARDENING_GATE.AUTHORIZATION,
      mapReadinessStatus(authzGate?.status),
      authzGate?.detail || "RBAC routePermissions"
    ),
    gate(
      FINAL_HARDENING_GATE.API_PROTECTION,
      mapReadinessStatus(apiGate?.status),
      apiGate?.detail || "rate limit + CSRF foundation"
    ),
    gate(
      FINAL_HARDENING_GATE.SECURITY,
      safety.status === "PASS" ? FINAL_GATE_STATUS.PASS : FINAL_GATE_STATUS.FAIL,
      `releaseSafety=${safety.status}`,
      { productionSafetyLock: safety.productionSafetyLock }
    ),
    gate(
      FINAL_HARDENING_GATE.AUDIT,
      typeof operationsAudit.listAudit === "function" ? FINAL_GATE_STATUS.PASS : FINAL_GATE_STATUS.BLOCKED,
      "operationsAudit + adminActionAudit available"
    ),
    gate(
      FINAL_HARDENING_GATE.MONITORING,
      monitoring.overall === "OK" || monitoring.overall === "WARNING"
        ? FINAL_GATE_STATUS.PASS
        : FINAL_GATE_STATUS.CONDITION,
      `overall=${monitoring.overall}`,
      { alertCount: monitoring.alerts?.length || 0 }
    ),
    gate(
      FINAL_HARDENING_GATE.ALERTING,
      alerts.overall === "OK" || alerts.overall === "CONDITION" || alerts.overall === "WARNING"
        ? FINAL_GATE_STATUS.PASS
        : FINAL_GATE_STATUS.CONDITION,
      `overall=${alerts.overall}`,
      { ruleCount: alerts.ruleCount || 0 }
    ),
    gate(
      FINAL_HARDENING_GATE.INCIDENT_READINESS,
      incidents.overall === "OK"
        ? FINAL_GATE_STATUS.PASS
        : incidents.overall === "CRITICAL"
          ? FINAL_GATE_STATUS.FAIL
          : FINAL_GATE_STATUS.CONDITION,
      `incidents=${incidents.incidentCount}`,
      {
        enriched: incidents.enriched === true,
        sampleFields: incidents.incidents?.[0]
          ? {
              severity: incidents.incidents[0].severity,
              category: incidents.incidents[0].category,
              correlationId: incidents.incidents[0].correlationId,
              resolutionState: incidents.incidents[0].resolutionState,
            }
          : null,
      }
    ),
    gate(
      FINAL_HARDENING_GATE.BACKUP_READINESS,
      backup.latestValid ? FINAL_GATE_STATUS.PASS : backup.dirExists ? FINAL_GATE_STATUS.CONDITION : FINAL_GATE_STATUS.BLOCKED,
      backup.latestValid ? "latest backup valid" : backup.latestStatus || "backup dir missing",
      { dirExists: backup.dirExists, latestValid: backup.latestValid }
    ),
    gate(
      FINAL_HARDENING_GATE.DATABASE_READINESS,
      monitoring.components?.db?.status === "OK" ? FINAL_GATE_STATUS.PASS : FINAL_GATE_STATUS.CONDITION,
      `db=${monitoring.components?.db?.status || "unknown"}`,
      { persistent: monitoring.components?.db?.persistent }
    ),
    gate(
      FINAL_HARDENING_GATE.WORKER_READINESS,
      monitoring.components?.workers?.status === "RUNNING" || monitoring.components?.workers?.healthy !== false
        ? FINAL_GATE_STATUS.PASS
        : FINAL_GATE_STATUS.CONDITION,
      `worker=${monitoring.components?.workers?.status || "unknown"}`,
      {
        failedJobs: (operations.jobs?.FAILED || 0) + (operations.jobs?.PERMANENTLY_FAILED || 0),
      }
    ),
    gate(
      FINAL_HARDENING_GATE.SUPPLIER_READINESS,
      !connector.credentialsConfigured && !connector.liveImportEnabled
        ? FINAL_GATE_STATUS.CONDITION
        : FINAL_GATE_STATUS.BLOCKED,
      connector.credentialsConfigured
        ? "credentials configured — live blocked until approval"
        : "credentials not configured (expected pre-go-live)",
      {
        credentialsConfigured: connector.credentialsConfigured,
        connected: false,
        liveImportEnabled: connector.liveImportEnabled,
        dryRun: connector.dryRun !== false,
        supplierOrdersBlocked: !flags.supplierOrdersEnabled,
        overall: supplierReport.SUPPLIER_INTEGRATION_READINESS?.overall,
      }
    ),
    gate(
      FINAL_HARDENING_GATE.PRODUCT_CATALOG_READINESS,
      publicCatalog.productCount === 0 ? FINAL_GATE_STATUS.PASS : FINAL_GATE_STATUS.CONDITION,
      `publicProducts=${publicCatalog.productCount}`,
      { qualityOverall: productQuality.PRODUCT_QUALITY_READINESS?.overall }
    ),
    gate(
      FINAL_HARDENING_GATE.PAYMENT_READINESS,
      !flags.stripeEnabled && !flags.paypalEnabled && !flags.paymentEnabled
        ? FINAL_GATE_STATUS.PASS
        : FINAL_GATE_STATUS.BLOCKED,
      `stripe=${flags.stripeEnabled} paypal=${flags.paypalEnabled}`,
      { stripeEnabled: flags.stripeEnabled, paypalEnabled: flags.paypalEnabled }
    ),
    gate(
      FINAL_HARDENING_GATE.COMMERCE_READINESS,
      !flags.salesEnabled && goLiveApproval.PRODUCTION_SAFETY_LOCK
        ? FINAL_GATE_STATUS.PASS
        : FINAL_GATE_STATUS.BLOCKED,
      `sales=${flags.salesEnabled} lock=${goLiveApproval.PRODUCTION_SAFETY_LOCK}`,
      {
        salesEnabled: flags.salesEnabled,
        checkoutEnabled: flags.checkoutEnabled,
        supplierOrdersEnabled: flags.supplierOrdersEnabled,
      }
    ),
    gate(
      FINAL_HARDENING_GATE.RELEASE_READINESS,
      releaseReport.PRODUCTION_RELEASE_READINESS?.diagnosticOnly === true
        ? FINAL_GATE_STATUS.PASS
        : FINAL_GATE_STATUS.BLOCKED,
      `releaseStatus=${releaseReport.PRODUCTION_RELEASE_READINESS?.status}`,
      { gateCount: releaseReport.PRODUCTION_RELEASE_READINESS?.gates?.length || 0 }
    ),
    gate(
      FINAL_HARDENING_GATE.ROLLBACK_READINESS,
      rollback.ready ? FINAL_GATE_STATUS.PASS : FINAL_GATE_STATUS.CONDITION,
      rollback.ready ? "rollback information available" : "previous release unknown",
      { automaticRollback: rollback.automaticRollback }
    ),
    gate(
      FINAL_HARDENING_GATE.ENVIRONMENT_SAFETY,
      envSafety.status,
      envSafety.detail,
      { checks: envSafety.checks }
    ),
    gate(
      FINAL_HARDENING_GATE.GO_LIVE_APPROVAL,
      FINAL_GATE_STATUS.BLOCKED,
      "explicit human go-live approval required",
      {
        productionSafetyLock: goLiveApproval.PRODUCTION_SAFETY_LOCK,
        autoActivate: false,
      }
    ),
  ];

  const decision = computeFinalDecision(gates, flags, connector);

  const gateSummary = {
    pass: gates.filter((g) => g.status === FINAL_GATE_STATUS.PASS).length,
    condition: gates.filter((g) => g.status === FINAL_GATE_STATUS.CONDITION).length,
    blocked: gates.filter((g) => g.status === FINAL_GATE_STATUS.BLOCKED).length,
    fail: gates.filter((g) => g.status === FINAL_GATE_STATUS.FAIL).length,
    total: gates.length,
  };

  const payload = {
    version: FINAL_HARDENING_VERSION,
    diagnosticOnly: FINAL_HARDENING_POLICY.diagnosticOnly,
    autoActivate: FINAL_HARDENING_POLICY.autoActivate,
    status: decision.status,
    gates,
    gateSummary,
    decision,
    manifest,
    deployment: {
      commit: deployment.commit,
      branch: deployment.branch,
      environment: deployment.environment,
    },
    safety: redactSecrets({
      salesEnabled: flags.salesEnabled,
      paymentEnabled: flags.paymentEnabled,
      stripeEnabled: flags.stripeEnabled,
      paypalEnabled: flags.paypalEnabled,
      supplierOrdersBlocked: !flags.supplierOrdersEnabled,
      productionSafetyLock: goLiveApproval.PRODUCTION_SAFETY_LOCK,
      liveImportEnabled: connector.liveImportEnabled,
      dryRunEnabled: connector.dryRun !== false,
      credentialsConfigured: connector.credentialsConfigured,
      publicProductCount: publicCatalog.productCount,
    }),
    timestamp: new Date().toISOString(),
  };

  if (adminDetail) {
    payload.incidents = incidents.incidents?.slice(0, 10) || [];
    payload.alerts = alerts.activeRules?.slice(0, 10) || [];
    payload.release = {
      status: releaseReport.PRODUCTION_RELEASE_READINESS?.status,
      blockedGates: releaseReport.PRODUCTION_RELEASE_READINESS?.gates?.filter(
        (g) => g.status === "BLOCKED"
      ).length,
    };
  }

  return { FINAL_PRODUCTION_HARDENING: payload };
}

function evaluatePublicFinalHardeningSummary() {
  const flags = getEffectiveFlags();
  const connector = createConnectorFromEnv().getStatus();
  const envSafety = evaluateEnvironmentSafety();

  return {
    version: FINAL_HARDENING_VERSION,
    diagnosticOnly: true,
    autoActivate: false,
    environmentSafe: envSafety.status === FINAL_GATE_STATUS.PASS,
    salesEnabled: flags.salesEnabled,
    supplierLive: connector.liveImportEnabled === true,
    goLiveBlocked: true,
    timestamp: new Date().toISOString(),
  };
}

module.exports = {
  evaluateFinalProductionHardening,
  evaluatePublicFinalHardeningSummary,
  evaluateEnvironmentSafety,
  computeFinalDecision,
  gate,
};
