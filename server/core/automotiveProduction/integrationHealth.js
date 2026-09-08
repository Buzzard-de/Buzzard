/**
 * Automotive Production Integration — health report.
 */
const automotiveCore = require("../automotiveCore");
const { assertProductionSafety } = require("./productionSafety");
const { validateProductionConfig } = require("./productionConfig");
const { listRegisteredSuppliers, getIntegrationManifest } = require("./integrationRegistry");
const { getTecDocConnectorStatus } = require("./tecdocConnectorManager");
const { getSyncStatus } = require("./syncScheduler");
const { getCircuit } = require("./integrationUtils");

function buildIntegrationHealth(options = {}) {
  const safety = assertProductionSafety();
  const config = validateProductionConfig();
  const coreHealth = automotiveCore.buildAutomotiveHealth(options.productStats);
  const suppliers = listRegisteredSuppliers();
  const tecdoc = getTecDocConnectorStatus();
  const sync = getSyncStatus();

  const component = (status, extra = {}) => ({
    status,
    configured: extra.configured ?? true,
    enabled: extra.enabled ?? false,
    live: extra.live ?? false,
    lastSuccess: extra.lastSuccess ?? null,
    lastFailure: extra.lastFailure ?? null,
    errors: extra.errors ?? [],
  });

  return {
    timestamp: new Date().toISOString(),
    manifest: getIntegrationManifest(),
    core: component("OK", { configured: true, enabled: true, live: false }),
    pim: component("OK", { configured: true, enabled: true, live: false }),
    suppliers: component("DRY_RUN", {
      configured: suppliers.length > 0,
      enabled: safety.automotiveProductionEnabled,
      live: safety.supplierLive,
      errors: safety.supplierLive ? ["SUPPLIER_LIVE should be OFF"] : [],
    }),
    tecdoc: component(tecdoc.mode || "mock", {
      configured: tecdoc.configured,
      enabled: tecdoc.enabled,
      live: tecdoc.live,
    }),
    search: component("OK", { configured: true, enabled: true, live: false }),
    fitment: component("OK", { configured: true, enabled: true, live: false }),
    price: component(safety.salesEnabled ? "ENABLED" : "BLOCKED", {
      enabled: safety.salesEnabled,
      live: false,
    }),
    stock: component("OK", { configured: true, enabled: true, live: false }),
    orders: component("BLOCKED", { enabled: false, live: safety.orderLive }),
    shipping: component("DRY_RUN", { configured: true, enabled: false, live: false }),
    tracking: component("MOCK", { configured: true, enabled: true, live: false }),
    returns: component("OK", { configured: true, enabled: true, live: false }),
    sync: component("DISABLED", {
      enabled: sync.schedulerRunning,
      configured: true,
      live: false,
    }),
    safety,
    config,
    circuits: {
      supplier: getCircuit("supplier:supplier-mock").state,
      tecdoc: getCircuit("tecdoc:main").state,
    },
    diagnosticOnly: true,
    legacyCore: coreHealth,
  };
}

module.exports = {
  buildIntegrationHealth,
};
