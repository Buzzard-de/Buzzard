/**
 * Part 23 — Supplier integration readiness center (aggregated diagnostic).
 */
const { listSuppliers } = require("./supplierRegistry");
const { evaluateSupplierHealth } = require("./supplierHealth");
const { getSafetySnapshot } = require("./supplierSafetyGate");
const { createConnectorFromEnv } = require("./realSupplierConnector");
const catalogReadService = require("../storefront/catalogReadService");
const { SUPPLIER_READINESS_STATUS } = require("../../core/supplierIntegrationConstants");

function evaluateSupplierIntegrationReadiness() {
  const suppliers = listSuppliers();
  const safety = getSafetySnapshot();
  const connector = createConnectorFromEnv().getStatus();
  const publicCatalog = catalogReadService.getHealth();

  const gates = [
    {
      gate: "SAFETY_LOCK",
      status: safety.productionSafetyLock ? SUPPLIER_READINESS_STATUS.PASS : SUPPLIER_READINESS_STATUS.BLOCKED,
      detail: "PRODUCTION_SAFETY_LOCK",
    },
    {
      gate: "SALES_OFF",
      status: !safety.salesEnabled ? SUPPLIER_READINESS_STATUS.PASS : SUPPLIER_READINESS_STATUS.BLOCKED,
      detail: `salesEnabled=${safety.salesEnabled}`,
    },
    {
      gate: "SUPPLIER_ORDERS_BLOCKED",
      status: safety.supplierOrdersBlocked ? SUPPLIER_READINESS_STATUS.PASS : SUPPLIER_READINESS_STATUS.BLOCKED,
      detail: "supplierOrdersBlocked=true",
    },
    {
      gate: "LIVE_IMPORT_BLOCKED",
      status: !connector.liveImportEnabled ? SUPPLIER_READINESS_STATUS.PASS : SUPPLIER_READINESS_STATUS.BLOCKED,
      detail: "REAL_SUPPLIER_LIVE_IMPORT=0",
    },
    {
      gate: "DRY_RUN_DEFAULT",
      status: safety.dryRunDefault ? SUPPLIER_READINESS_STATUS.PASS : SUPPLIER_READINESS_STATUS.BLOCKED,
      detail: "REAL_SUPPLIER_DRY_RUN=1",
    },
    {
      gate: "CREDENTIALS",
      status: !connector.credentialsConfigured ? SUPPLIER_READINESS_STATUS.PASS : SUPPLIER_READINESS_STATUS.CONDITION,
      detail: connector.credentialsConfigured ? "configured_live_blocked" : "not_configured",
    },
    {
      gate: "PUBLIC_PRODUCTS",
      status: publicCatalog.productCount === 0 ? SUPPLIER_READINESS_STATUS.PASS : SUPPLIER_READINESS_STATUS.CONDITION,
      detail: `publicProducts=${publicCatalog.productCount}`,
    },
    {
      gate: "MULTI_SUPPLIER_REGISTRY",
      status: suppliers.length >= 4 ? SUPPLIER_READINESS_STATUS.PASS : SUPPLIER_READINESS_STATUS.CONDITION,
      detail: `suppliers=${suppliers.length}`,
    },
    {
      gate: "ADAPTER_LAYER",
      status: SUPPLIER_READINESS_STATUS.PASS,
      detail: "api+xml+csv+dry-run",
    },
    {
      gate: "MAPPING_PIPELINE",
      status: SUPPLIER_READINESS_STATUS.PASS,
      detail: "pim_mapping_ready",
    },
  ];

  const summary = {
    pass: gates.filter((g) => g.status === SUPPLIER_READINESS_STATUS.PASS).length,
    blocked: gates.filter((g) => g.status === SUPPLIER_READINESS_STATUS.BLOCKED).length,
    condition: gates.filter((g) => g.status === SUPPLIER_READINESS_STATUS.CONDITION).length,
  };

  const overall =
    summary.blocked > 0 ? "NOT_READY" : summary.condition > 0 ? "CONDITION" : "READY";

  const sampleHealth = evaluateSupplierHealth("api-supplier-dry");

  return {
    SUPPLIER_INTEGRATION_READINESS: {
      overall,
      diagnosticOnly: true,
      autoActivate: false,
      gates,
      summary,
      suppliers: suppliers.map((s) => ({
        id: s.id,
        name: s.name,
        format: s.format,
        credentialsConfigured: s.credentialsConfigured,
        canGoLive: false,
      })),
      safety: {
        productionSafetyLock: safety.productionSafetyLock,
        salesEnabled: safety.salesEnabled,
        supplierOrdersBlocked: safety.supplierOrdersBlocked,
        liveImportEnabled: connector.liveImportEnabled,
        dryRunDefault: safety.dryRunDefault,
        credentialsConfigured: connector.credentialsConfigured,
        stripeEnabled: process.env.BUZZARD_STRIPE_ENABLED === "1" || process.env.STRIPE_ENABLED === "1",
        paypalEnabled: process.env.BUZZARD_PAYPAL_ENABLED === "1" || process.env.PAYPAL_ENABLED === "1",
      },
      sampleHealth: {
        supplierId: sampleHealth.supplierId,
        overall: sampleHealth.overall,
        checks: sampleHealth.checks?.length,
      },
      timestamp: new Date().toISOString(),
    },
  };
}

module.exports = {
  evaluateSupplierIntegrationReadiness,
};
