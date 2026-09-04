"use strict";

/**
 * Part 28 — Final Go-Live Readiness
 *
 * Diagnostic-only. Fail-closed. No activation.
 */
const goLiveApproval = require("../commerce/goLiveApproval");
const { getEffectiveFlags } = require("../commerce/commerceFeatureFlags");
const { createConnectorFromEnv } = require("../supplier/realSupplierConnector");
const catalogReadService = require("../storefront/catalogReadService");

const SAFETY = Object.freeze({
  salesEnabled: false,
  publicSalesEnabled: false,
  productionSafetyLock: true,
  supplierOrdersBlocked: true,
  supplierLiveImport: false,
  supplierDryRun: true,
  stripeEnabled: false,
  paypalEnabled: false,
  autoActivate: false,
});

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

function buildSafetyGate() {
  const salesEnabled = readBooleanEnv("BUZZARD_SALES_ENABLED", SAFETY.salesEnabled);
  const publicSalesEnabled = readBooleanEnv(
    "NEXT_PUBLIC_SALES_ENABLED",
    SAFETY.publicSalesEnabled
  );
  const productionSafetyLock =
    process.env.PRODUCTION_SAFETY_LOCK === undefined
      ? goLiveApproval.PRODUCTION_SAFETY_LOCK
      : readBooleanEnv("PRODUCTION_SAFETY_LOCK", SAFETY.productionSafetyLock);
  const liveImport = readBooleanEnv("REAL_SUPPLIER_LIVE_IMPORT", SAFETY.supplierLiveImport);
  const dryRun = readBooleanEnv("REAL_SUPPLIER_DRY_RUN", SAFETY.supplierDryRun);

  const ok =
    salesEnabled === false &&
    publicSalesEnabled === false &&
    productionSafetyLock === true &&
    liveImport === false &&
    dryRun === true;

  return gate("environmentSafety", ok, {
    salesEnabled,
    publicSalesEnabled,
    productionSafetyLock,
    supplierLiveImport: liveImport,
    supplierDryRun: dryRun,
    diagnosticOnly: true,
  });
}

function buildSupplierGate() {
  const connector = createConnectorFromEnv().getStatus();
  const flags = getEffectiveFlags();
  const ok =
    !connector.credentialsConfigured &&
    !connector.liveImportEnabled &&
    !flags.supplierOrdersEnabled;

  return gate("supplierSafety", ok, {
    connected: false,
    credentialsConfigured: connector.credentialsConfigured,
    apiCalled: false,
    liveImport: connector.liveImportEnabled,
    ordersEnabled: flags.supplierOrdersEnabled,
    dryRun: connector.dryRun !== false,
  });
}

function buildPaymentGate() {
  const flags = getEffectiveFlags();
  const ok = !flags.stripeEnabled && !flags.paypalEnabled && !flags.paymentEnabled;
  return gate("paymentSafety", ok, {
    stripe: flags.stripeEnabled,
    paypal: flags.paypalEnabled,
    paymentActivation: false,
  });
}

function buildCommerceGate() {
  const flags = getEffectiveFlags();
  const publicCatalog = catalogReadService.getHealth();
  const ok =
    !flags.salesEnabled &&
    publicCatalog.productCount === 0 &&
    goLiveApproval.PRODUCTION_SAFETY_LOCK;

  return gate("commerceSafety", ok, {
    salesEnabled: flags.salesEnabled,
    publishingEnabled: false,
    publicProducts: publicCatalog.productCount,
    autoActivate: false,
  });
}

function buildApprovalGate() {
  return gate("humanGoLiveApproval", false, {
    required: true,
    approvalRecorded: false,
    reason: "Explicit human go-live approval is required.",
  });
}

function buildGates() {
  return [
    buildSafetyGate(),
    buildSupplierGate(),
    buildPaymentGate(),
    buildCommerceGate(),
    gate("securityReadiness", true, { source: "Part 21" }),
    gate("productQualityReadiness", true, { source: "Part 22" }),
    gate("supplierIntegrationReadiness", true, {
      source: "Part 23",
      liveIntegration: false,
    }),
    gate("productionReleaseReadiness", true, { source: "Part 24" }),
    gate("productionNextReadiness", true, { source: "Part 25" }),
    gate("finalProductionHardening", true, { source: "Part 26" }),
    gate("operationalFinalization", true, { source: "Part 27" }),
    buildApprovalGate(),
  ];
}

function getFinalGoLiveReadiness() {
  const gates = buildGates();
  const blockers = gates.filter((item) => !item.ok);
  const flags = getEffectiveFlags();

  return {
    ready: blockers.length === 0,
    status: blockers.length === 0 ? "READY" : "BLOCKED",
    diagnosticOnly: true,
    autoActivate: false,
    salesEnabled: flags.salesEnabled,
    publicSalesEnabled: flags.salesEnabled,
    supplierLive: createConnectorFromEnv().getStatus().liveImportEnabled === true,
    supplierOrdersBlocked: !flags.supplierOrdersEnabled,
    payments: {
      stripe: flags.stripeEnabled,
      paypal: flags.paypalEnabled,
      enabled: flags.paymentEnabled,
    },
    publishing: {
      enabled: false,
      publicProducts: catalogReadService.getHealth().productCount,
    },
    gates,
    blockers,
    safety: {
      ...SAFETY,
      current: {
        salesEnabled: flags.salesEnabled,
        publicSalesEnabled: readBooleanEnv("NEXT_PUBLIC_SALES_ENABLED", false),
        productionSafetyLock: goLiveApproval.PRODUCTION_SAFETY_LOCK,
        supplierLiveImport: readBooleanEnv("REAL_SUPPLIER_LIVE_IMPORT", false),
        supplierDryRun: readBooleanEnv("REAL_SUPPLIER_DRY_RUN", true),
        stripeEnabled: flags.stripeEnabled,
        paypalEnabled: flags.paypalEnabled,
        autoActivate: false,
      },
    },
    activationAllowed: false,
    humanApprovalRequired: true,
    generatedAt: new Date().toISOString(),
  };
}

function validateFinalGoLiveReadiness() {
  const result = getFinalGoLiveReadiness();
  return {
    ...result,
    validationOnly: true,
    mutationPerformed: false,
    supplierCallPerformed: false,
    paymentCallPerformed: false,
    publishPerformed: false,
    salesActivationPerformed: false,
  };
}

function getPublicFinalGoLiveSummary() {
  const readiness = getFinalGoLiveReadiness();
  return {
    status: readiness.status,
    ready: readiness.ready,
    diagnosticOnly: true,
    autoActivate: false,
    salesEnabled: readiness.salesEnabled,
    supplierLive: readiness.supplierLive,
    blockers: readiness.blockers.map((item) => ({
      name: item.name,
      status: item.status,
      reason: item.reason,
    })),
  };
}

module.exports = {
  getFinalGoLiveReadiness,
  validateFinalGoLiveReadiness,
  buildGates,
  getPublicFinalGoLiveSummary,
};
