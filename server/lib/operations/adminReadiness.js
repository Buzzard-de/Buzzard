/**
 * Part 20 — Central admin / backoffice readiness aggregator (diagnostic only).
 * Reuses Parts 15–19 evaluators — no parallel systems.
 */
const { ADMIN_BACKOFFICE_GATES } = require("../../core/adminBackofficeConstants");
const { READINESS_GATE_STATUS } = require("../../core/operationsConstants");
const { evaluateGoLiveReadiness } = require("./goLiveReadiness");
const { getMonitoringSnapshot } = require("./monitoringReadiness");
const operationsControl = require("./operationsControl");
const backupAutomation = require("../backupAutomation");
const catalogReadService = require("../storefront/catalogReadService");
const { createConnectorFromEnv } = require("../supplier/realSupplierConnector");
const { getEffectiveFlags } = require("../commerce/commerceFeatureFlags");
const goLiveApproval = require("../commerce/goLiveApproval");
const { CRITICAL_ACTIONS } = require("./adminSafetyGate");
const { evaluateCatalogReadiness } = require("./catalogReadiness");
const incidentReadiness = require("./incidentReadiness");

function gate(name, status, detail, extras = {}) {
  return { gate: name, status, detail, ...extras };
}

function mapOverallToStatus(overall) {
  if (overall === "READY" || overall === "OK" || overall === "PASS") return READINESS_GATE_STATUS.PASS;
  if (overall === "NOT_READY" || overall === "FAIL" || overall === "BLOCKED") return READINESS_GATE_STATUS.BLOCKED;
  if (overall === "CONDITION" || overall === "WARNING") return READINESS_GATE_STATUS.CONDITION;
  return READINESS_GATE_STATUS.CONDITION;
}

async function evaluateAdminReadiness() {
  const gates = [];
  const flags = getEffectiveFlags();

  const monitoring = await getMonitoringSnapshot();
  gates.push(
    gate(
      "SYSTEM_HEALTH",
      mapOverallToStatus(monitoring.overall),
      `overall=${monitoring.overall} alerts=${monitoring.alerts?.length || 0}`
    )
  );

  const goLive = await evaluateGoLiveReadiness();
  gates.push(
    gate(
      "GO_LIVE_READINESS",
      mapOverallToStatus(goLive.overall),
      goLive.overall,
      { summary: goLive.summary }
    )
  );

  let storefront = { STOREFRONT_READINESS: { overall: "NOT_READY", summary: {} } };
  try {
    const storefrontReadiness = require("../storefront/storefrontReadiness");
    storefront = storefrontReadiness.evaluateStorefrontReadiness();
  } catch {
    /* optional */
  }
  gates.push(
    gate(
      "STOREFRONT",
      mapOverallToStatus(storefront.STOREFRONT_READINESS?.overall),
      storefront.STOREFRONT_READINESS?.overall || "unknown"
    )
  );

  let cx = { CUSTOMER_EXPERIENCE_READINESS: { overall: "NOT_READY" } };
  try {
    const customerExperienceReadiness = require("../customer/customerExperienceReadiness");
    cx = customerExperienceReadiness.evaluateCustomerExperienceReadiness();
  } catch {
    /* optional */
  }
  gates.push(
    gate(
      "CUSTOMER_EXPERIENCE",
      mapOverallToStatus(cx.CUSTOMER_EXPERIENCE_READINESS?.overall),
      cx.CUSTOMER_EXPERIENCE_READINESS?.overall || "unknown"
    )
  );

  const ops = operationsControl.getOperationsSummary();
  gates.push(
    gate(
      "OPERATIONS_JOBS",
      (ops.jobs?.FAILED || 0) + (ops.jobs?.PERMANENTLY_FAILED || 0) > 0
        ? READINESS_GATE_STATUS.CONDITION
        : READINESS_GATE_STATUS.PASS,
      `total=${ops.total} failed=${(ops.jobs?.FAILED || 0) + (ops.jobs?.PERMANENTLY_FAILED || 0)}`
    )
  );

  const backup = backupAutomation.getBackupReadiness();
  gates.push(
    gate(
      "BACKUP",
      backup.latestValid ? READINESS_GATE_STATUS.PASS : backup.dirExists ? READINESS_GATE_STATUS.CONDITION : READINESS_GATE_STATUS.FAIL,
      backup.latestStatus || "unknown"
    )
  );

  const catalog = evaluateCatalogReadiness();
  gates.push(
    gate(
      "CATALOG",
      mapOverallToStatus(catalog.overall),
      `public=${catalog.publicProductCount}`
    )
  );

  const supplier = createConnectorFromEnv().getStatus();
  gates.push(
    gate(
      "SUPPLIER",
      supplier.credentialsConfigured ? READINESS_GATE_STATUS.CONDITION : READINESS_GATE_STATUS.BLOCKED,
      supplier.blockedReason || "not_connected"
    )
  );

  gates.push(
    gate(
      "COMMERCE_SAFETY",
      !flags.salesEnabled && flags.mockPaymentOnly ? READINESS_GATE_STATUS.PASS : READINESS_GATE_STATUS.BLOCKED,
      `sales=${flags.salesEnabled} mockPayment=${flags.mockPaymentOnly}`
    )
  );

  gates.push(
    gate(
      "ADMIN_SAFETY",
      goLiveApproval.PRODUCTION_SAFETY_LOCK ? READINESS_GATE_STATUS.PASS : READINESS_GATE_STATUS.BLOCKED,
      `criticalActions=${CRITICAL_ACTIONS.size} goLiveLock=${goLiveApproval.PRODUCTION_SAFETY_LOCK}`
    )
  );

  gates.push(
    gate("AUDIT", READINESS_GATE_STATUS.PASS, "operationsAudit active")
  );

  gates.push(
    gate("RBAC", READINESS_GATE_STATUS.PASS, "globalAuthMiddleware + routePermissions")
  );

  const summary = {
    pass: gates.filter((g) => g.status === READINESS_GATE_STATUS.PASS).length,
    fail: gates.filter((g) => g.status === READINESS_GATE_STATUS.FAIL).length,
    blocked: gates.filter((g) => g.status === READINESS_GATE_STATUS.BLOCKED).length,
    condition: gates.filter((g) => g.status === READINESS_GATE_STATUS.CONDITION).length,
  };

  const overall =
    summary.fail > 0 || summary.blocked > 0
      ? "NOT_READY"
      : summary.condition > 0
        ? "CONDITION"
        : "READY";

  const catalogHealth = catalogReadService.getHealth();
  const incidents = await incidentReadiness.getIncidentReadiness();

  return {
    ADMIN_BACKOFFICE_READINESS: {
      overall,
      diagnosticOnly: true,
      autoActivate: false,
      gateNames: ADMIN_BACKOFFICE_GATES,
      gates,
      summary,
      publicProductCount: catalogHealth.productCount,
      salesEnabled: flags.salesEnabled,
      goLiveLock: goLiveApproval.PRODUCTION_SAFETY_LOCK,
      incidents: incidents.overall,
      timestamp: new Date().toISOString(),
    },
  };
}

async function getAdminDashboardSnapshot() {
  const readiness = await evaluateAdminReadiness();
  const monitoring = await getMonitoringSnapshot();
  const ops = operationsControl.getOperationsSummary();
  const backup = backupAutomation.getBackupReadiness();
  const catalog = catalogReadService.getHealth();
  const supplier = createConnectorFromEnv().getStatus();
  const flags = getEffectiveFlags();

  return {
    timestamp: new Date().toISOString(),
    diagnosticOnly: true,
    autoActivate: false,
    readiness: readiness.ADMIN_BACKOFFICE_READINESS,
    productCatalog: {
      publicProducts: catalog.productCount,
      salesEnabled: catalog.salesEnabled,
      status: catalog.productCount === 0 ? "EMPTY_EXPECTED" : "REVIEW",
    },
    orders: {
      commercialOrdersBlocked: !flags.salesEnabled,
      supplierOrdersBlocked: true,
    },
    customerSupport: {
      module: true,
      salesOffSafe: !flags.salesEnabled,
    },
    supplier: {
      connected: supplier.connected,
      liveImport: supplier.liveImportEnabled,
      dryRun: supplier.dryRun,
      status: supplier.blockedReason || "not_connected",
    },
    operations: ops,
    backup,
    systemHealth: {
      overall: monitoring.overall,
      goLiveLock: monitoring.components?.goLiveLock,
      alerts: monitoring.alerts?.length || 0,
    },
    goLive: {
      lock: goLiveApproval.PRODUCTION_SAFETY_LOCK,
      canActivateSales: goLiveApproval.canActivateSales(),
    },
  };
}

module.exports = {
  evaluateAdminReadiness,
  getAdminDashboardSnapshot,
};
