/**
 * Part 23 — Supplier health diagnostics.
 */
const { getSupplierDefinition, getSupplierAdapter } = require("./supplierRegistry");
const { evaluateCapabilityMatrix } = require("./supplierCapabilityMatrix");
const { getSafetySnapshot } = require("./supplierSafetyGate");
const { createConnectorFromEnv } = require("./realSupplierConnector");
const { SUPPLIER_READINESS_STATUS } = require("../../core/supplierIntegrationConstants");

function evaluateSupplierHealth(supplierId) {
  const def = getSupplierDefinition(supplierId);
  if (!def) {
    return {
      ok: false,
      supplierId,
      status: SUPPLIER_READINESS_STATUS.BLOCKED,
      error: "unknown_supplier",
    };
  }

  const adapter = getSupplierAdapter(supplierId);
  const config = adapter?.validateConfiguration?.() || { ok: false, credentialsConfigured: false };
  const capabilities = evaluateCapabilityMatrix(def);
  const safety = getSafetySnapshot(supplierId);
  const connectorStatus = def.id === "REAL-WHOLESALER-001" ? createConnectorFromEnv().getStatus() : null;

  const checks = [
    {
      check: "credentials",
      status: def.credentialsConfigured ? SUPPLIER_READINESS_STATUS.CONDITION : SUPPLIER_READINESS_STATUS.PASS,
      detail: def.credentialsConfigured ? "configured_but_live_blocked" : "not_configured",
    },
    {
      check: "connection",
      status: SUPPLIER_READINESS_STATUS.BLOCKED,
      detail: "network_blocked",
    },
    {
      check: "api",
      status: def.format === "api" ? SUPPLIER_READINESS_STATUS.CONDITION : SUPPLIER_READINESS_STATUS.UNKNOWN,
      detail: def.format,
    },
    {
      check: "xml",
      status: def.format === "xml" ? SUPPLIER_READINESS_STATUS.CONDITION : SUPPLIER_READINESS_STATUS.UNKNOWN,
      detail: def.format,
    },
    {
      check: "feed",
      status: ["xml", "csv"].includes(def.format) ? SUPPLIER_READINESS_STATUS.CONDITION : SUPPLIER_READINESS_STATUS.UNKNOWN,
      detail: def.format,
    },
    {
      check: "catalog",
      status: capabilities.matrix.catalog?.status || SUPPLIER_READINESS_STATUS.CONDITION,
    },
    {
      check: "price",
      status: capabilities.matrix.price?.status || SUPPLIER_READINESS_STATUS.CONDITION,
    },
    {
      check: "stock",
      status: capabilities.matrix.stock?.status || SUPPLIER_READINESS_STATUS.CONDITION,
    },
    {
      check: "mapping",
      status: SUPPLIER_READINESS_STATUS.PASS,
      detail: "mapping_service_ready",
    },
    {
      check: "validation",
      status: SUPPLIER_READINESS_STATUS.PASS,
      detail: "quality_hardening_ready",
    },
    {
      check: "rate_limit",
      status: SUPPLIER_READINESS_STATUS.PASS,
      detail: "dry_run_no_outbound",
    },
    {
      check: "errors",
      status: SUPPLIER_READINESS_STATUS.PASS,
      detail: "standard_error_model",
    },
    {
      check: "last_successful_sync",
      status: SUPPLIER_READINESS_STATUS.UNKNOWN,
      detail: null,
    },
    {
      check: "live_import_permission",
      status: SUPPLIER_READINESS_STATUS.BLOCKED,
      detail: connectorStatus?.blockedReason || safety.liveImportEnabled ? "live_disabled" : "credentials_not_configured",
    },
  ];

  const blocked = checks.filter((c) => c.status === SUPPLIER_READINESS_STATUS.BLOCKED).length;
  const overall =
    blocked > 0 ? "NOT_READY" : def.credentialsConfigured ? "CONDITION" : "READY";

  return {
    ok: true,
    supplierId,
    name: def.name,
    format: def.format,
    overall,
    diagnosticOnly: true,
    autoActivate: false,
    credentialsConfigured: def.credentialsConfigured,
    canConnectLive: false,
    checks,
    capabilities: capabilities.summary,
    safety,
    config: {
      ok: config.ok,
      credentialsConfigured: config.credentialsConfigured,
      dryRun: config.dryRun !== false,
      networkBlocked: config.networkBlocked !== false,
    },
    timestamp: new Date().toISOString(),
  };
}

module.exports = {
  evaluateSupplierHealth,
};
