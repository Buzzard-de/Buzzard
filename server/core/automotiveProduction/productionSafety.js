/**
 * Automotive Production Integration — safety engine (fail-closed, no bypass).
 */
const { GLOBAL_SAFETY_POLICY } = require("../globalSafetyPolicy");
const { PRODUCTION_CONFIG } = require("./productionConfig");

const PRODUCTION_SAFETY = Object.freeze({
  ...GLOBAL_SAFETY_POLICY,
  automotiveProductionEnabled: false,
  supplierLive: false,
  liveImport: false,
  tecdocLive: false,
  orderLive: false,
  autoOrder: false,
  syncEnabled: false,
});

function assertProductionSafety() {
  const supplierLive =
    PRODUCTION_CONFIG.supplierLiveEnabled() && PRODUCTION_CONFIG.realSupplierLiveImport();
  const tecdocLive = PRODUCTION_CONFIG.tecdocEnabled() && !PRODUCTION_CONFIG.tecdocDryRun();
  const orderLive =
    PRODUCTION_CONFIG.orderLiveEnabled() &&
    PRODUCTION_CONFIG.supplierLiveEnabled() &&
    PRODUCTION_CONFIG.salesEnabled();
  const publishEnabled =
    process.env.AUTOMOTIVE_PUBLISH_ENABLED === "1" && !PRODUCTION_CONFIG.autoPublish();

  return {
    ...PRODUCTION_SAFETY,
    automotiveProductionEnabled: PRODUCTION_CONFIG.automotiveProductionEnabled(),
    supplierLive,
    liveImport: supplierLive,
    tecdocLive,
    orderLive,
    autoOrder: PRODUCTION_CONFIG.autoOrderEnabled(),
    syncEnabled:
      PRODUCTION_CONFIG.supplierSyncEnabled() ||
      PRODUCTION_CONFIG.stockSyncEnabled() ||
      PRODUCTION_CONFIG.priceSyncEnabled(),
    salesEnabled: PRODUCTION_CONFIG.salesEnabled(),
    paymentsEnabled: PRODUCTION_CONFIG.paymentsEnabled(),
    publishEnabled,
    compliant:
      !supplierLive &&
      !tecdocLive &&
      !orderLive &&
      !PRODUCTION_CONFIG.autoPublish() &&
      GLOBAL_SAFETY_POLICY.status === "BLOCKED",
  };
}

function canCallRealSupplier() {
  return (
    PRODUCTION_CONFIG.realSupplierLiveImport() === true &&
    PRODUCTION_CONFIG.supplierLiveEnabled() === true &&
    PRODUCTION_CONFIG.orderLiveEnabled() === true
  );
}

function canCallRealTecDoc() {
  return PRODUCTION_CONFIG.tecdocEnabled() === true && !PRODUCTION_CONFIG.tecdocDryRun();
}

function canCreateLiveOrder() {
  return (
    PRODUCTION_CONFIG.orderLiveEnabled() &&
    PRODUCTION_CONFIG.supplierLiveEnabled() &&
    PRODUCTION_CONFIG.salesEnabled()
  );
}

function canPublish(manualPublish = false) {
  if (!manualPublish) return false;
  if (PRODUCTION_CONFIG.autoPublish()) return false;
  if (process.env.AUTOMOTIVE_PUBLISH_ENABLED !== "1") return false;
  return false;
}

function gateLiveOperation(operation) {
  const safety = assertProductionSafety();
  const gates = {
    supplier: canCallRealSupplier(),
    tecdoc: canCallRealTecDoc(),
    order: canCreateLiveOrder(),
    publish: canPublish(true),
    sync: PRODUCTION_CONFIG.supplierSyncEnabled(),
  };
  if (!gates[operation]) {
    return {
      allowed: false,
      code:
        operation === "supplier"
          ? "SUPPLIER_LIVE_DISABLED"
          : operation === "tecdoc"
            ? "TECDOC_DISABLED"
            : operation === "order"
              ? "ORDER_LIVE_DISABLED"
              : operation === "publish"
                ? "PUBLISH_DISABLED"
                : "INTEGRATION_DISABLED",
      safety,
    };
  }
  return { allowed: true, safety };
}

module.exports = {
  PRODUCTION_SAFETY,
  assertProductionSafety,
  canCallRealSupplier,
  canCallRealTecDoc,
  canCreateLiveOrder,
  canPublish,
  gateLiveOperation,
};
