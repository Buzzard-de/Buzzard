"use strict";

/**
 * Part 29 — Final Pre-Launch Audit
 *
 * Diagnostic-only. Fail-closed. Consumes Parts 16–28 readiness systems.
 * No activation, no supplier connect, no payment/sales enablement.
 */
const {
  PART29_VERSION,
  PART29_STATUS,
  PART29_POLICY,
} = require("../../core/part29PreLaunchAuditConstants");
const goLiveApproval = require("../commerce/goLiveApproval");
const { getEffectiveFlags } = require("../commerce/commerceFeatureFlags");
const { createConnectorFromEnv } = require("../supplier/realSupplierConnector");
const catalogReadService = require("../storefront/catalogReadService");
const configurationValidation = require("../operations/configurationValidation");
const { buildPart27Readiness } = require("../operations/part27OperationalFinalization");
const { evaluateFinalProductionHardening } = require("./finalProductionHardening");
const { getFinalGoLiveReadiness } = require("./finalGoLiveReadiness");

function gate(name, ok, details = {}) {
  return {
    name,
    status: ok ? "PASS" : "BLOCKED",
    ok: Boolean(ok),
    ...details,
  };
}

function readBooleanEnv(name, defaultValue) {
  const value = process.env[name];
  if (value === undefined) {
    return defaultValue;
  }
  return ["1", "true", "TRUE", "yes", "YES"].includes(value);
}

function findPart26Gate(part26, name) {
  return part26?.gates?.find((item) => item.name === name);
}

function part26GateOk(part26, name) {
  const item = findPart26Gate(part26, name);
  return item?.status === "PASS";
}

function part27ChecksOk(part27) {
  return Object.entries(part27.gates || {})
    .filter(([name]) => name !== "goLiveApproval")
    .every(([, value]) => value.status !== PART29_STATUS.BLOCKED);
}

function part28ChecksOk(part28) {
  return (part28.gates || [])
    .filter((item) => item.name !== "humanGoLiveApproval")
    .every((item) => item.ok === true);
}

async function buildPart29Gates() {
  const config = configurationValidation.validateConfiguration();
  const part27 = buildPart27Readiness();
  const part28 = getFinalGoLiveReadiness();
  const part26Result = await evaluateFinalProductionHardening();
  const part26 = part26Result.FINAL_PRODUCTION_HARDENING;
  const flags = getEffectiveFlags();
  const connector = createConnectorFromEnv().getStatus();

  return [
    gate("configuration", config.ok, { source: "Part 17", diagnosticOnly: true }),
    gate("security", part26GateOk(part26, "security"), { source: "Part 21/26", diagnosticOnly: true }),
    gate("monitoring", part26GateOk(part26, "monitoring"), { source: "Part 26", diagnosticOnly: true }),
    gate("incidentReadiness", part26GateOk(part26, "incidentReadiness"), {
      source: "Part 26",
      diagnosticOnly: true,
    }),
    gate("backupReadiness", part26GateOk(part26, "backupReadiness"), {
      source: "Part 26",
      diagnosticOnly: true,
    }),
    gate("databaseReadiness", part26GateOk(part26, "databaseReadiness"), {
      source: "Part 26",
      diagnosticOnly: true,
    }),
    gate("workerReadiness", part26GateOk(part26, "workerReadiness"), {
      source: "Part 26",
      diagnosticOnly: true,
    }),
    gate("productQuality", part26GateOk(part26, "productCatalogReadiness"), {
      source: "Part 22/26",
      diagnosticOnly: true,
    }),
    gate("supplierReadiness", !connector.credentialsConfigured && !connector.liveImportEnabled, {
      source: "Part 23/28",
      verificationOnly: true,
      connected: false,
      apiCalled: false,
      diagnosticOnly: true,
    }),
    gate("paymentReadiness", !flags.stripeEnabled && !flags.paypalEnabled && !flags.paymentEnabled, {
      source: "Part 28",
      verificationOnly: true,
      stripe: flags.stripeEnabled,
      paypal: flags.paypalEnabled,
      diagnosticOnly: true,
    }),
    gate("commerceReadiness", !flags.salesEnabled && catalogReadService.getHealth().productCount === 0, {
      source: "Part 28",
      salesEnabled: flags.salesEnabled,
      publicProducts: catalogReadService.getHealth().productCount,
      diagnosticOnly: true,
    }),
    gate("releaseReadiness", part26GateOk(part26, "releaseReadiness"), {
      source: "Part 25/26",
      diagnosticOnly: true,
    }),
    gate("rollbackReadiness", part26GateOk(part26, "rollbackReadiness"), {
      source: "Part 25",
      diagnosticOnly: true,
    }),
    gate("operationalFinalization", part27ChecksOk(part27), {
      source: "Part 27",
      upstreamStatus: part27.status,
      diagnosticOnly: true,
    }),
    gate("finalGoLiveReadiness", part28ChecksOk(part28), {
      source: "Part 28",
      upstreamStatus: part28.status,
      diagnosticOnly: true,
    }),
    gate("humanPreLaunchApproval", false, {
      required: true,
      approvalRecorded: false,
      reason: "Explicit human pre-launch approval is required.",
      diagnosticOnly: true,
    }),
  ];
}

async function getFinalPreLaunchAudit() {
  const gates = await buildPart29Gates();
  const blockers = gates.filter((item) => !item.ok);
  const flags = getEffectiveFlags();
  const connector = createConnectorFromEnv().getStatus();
  const part28 = getFinalGoLiveReadiness();
  const part27 = buildPart27Readiness();

  return {
    part: 29,
    version: PART29_VERSION,
    ready: false,
    status: PART29_STATUS.BLOCKED,
    diagnosticOnly: PART29_POLICY.diagnosticOnly,
    autoActivate: PART29_POLICY.autoActivate,
    activationAllowed: PART29_POLICY.activationAllowed,
    supplierLive: connector.liveImportEnabled === true,
    salesEnabled: flags.salesEnabled,
    publicSalesEnabled: readBooleanEnv("NEXT_PUBLIC_SALES_ENABLED", false),
    humanApprovalRequired: PART29_POLICY.humanApprovalRequired,
    gates,
    blockers,
    upstream: {
      part28: {
        status: part28.status,
        blockerCount: part28.blockers.length,
      },
      part27: {
        status: part27.status,
      },
    },
    safety: {
      salesEnabled: flags.salesEnabled,
      publicSalesEnabled: readBooleanEnv("NEXT_PUBLIC_SALES_ENABLED", false),
      productionSafetyLock: goLiveApproval.PRODUCTION_SAFETY_LOCK,
      supplierLiveImport: readBooleanEnv("REAL_SUPPLIER_LIVE_IMPORT", false),
      supplierDryRun: readBooleanEnv("REAL_SUPPLIER_DRY_RUN", true),
      stripeEnabled: flags.stripeEnabled,
      paypalEnabled: flags.paypalEnabled,
      autoActivate: false,
      supplierOrdersBlocked: !flags.supplierOrdersEnabled,
    },
    payments: {
      stripe: flags.stripeEnabled,
      paypal: flags.paypalEnabled,
      enabled: flags.paymentEnabled,
    },
    publishing: {
      enabled: false,
      publicProducts: catalogReadService.getHealth().productCount,
    },
    generatedAt: new Date().toISOString(),
  };
}

async function validateFinalPreLaunchAudit() {
  const result = await getFinalPreLaunchAudit();
  return {
    ...result,
    validationOnly: true,
    mutationPerformed: false,
    supplierCallPerformed: false,
    paymentCallPerformed: false,
    publishPerformed: false,
    salesActivationPerformed: false,
    goLiveLockRemoved: false,
  };
}

async function getPublicFinalPreLaunchSummary() {
  const audit = await getFinalPreLaunchAudit();
  return {
    status: audit.status,
    ready: audit.ready,
    diagnosticOnly: true,
    autoActivate: false,
    salesEnabled: audit.salesEnabled,
    supplierLive: audit.supplierLive,
    humanApprovalRequired: true,
    blockers: audit.blockers.map((item) => ({
      name: item.name,
      status: item.status,
      reason: item.reason,
    })),
  };
}

module.exports = {
  getFinalPreLaunchAudit,
  validateFinalPreLaunchAudit,
  buildPart29Gates,
  getPublicFinalPreLaunchSummary,
};
