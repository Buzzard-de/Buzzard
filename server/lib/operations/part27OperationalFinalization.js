"use strict";

const {
  PART27_STATUS,
  PART27_GATES,
} = require("../../core/part27OperationalFinalizationConstants");
const goLiveApproval = require("../commerce/goLiveApproval");
const { getEffectiveFlags } = require("../commerce/commerceFeatureFlags");
const { createConnectorFromEnv } = require("../supplier/realSupplierConnector");
const configurationValidation = require("./configurationValidation");

function safeBoolean(value) {
  return value === true || value === "true" || value === 1 || value === "1";
}

function evaluateEnvironmentSafety(env = process.env) {
  const checks = {
    salesDisabled: String(env.BUZZARD_SALES_ENABLED ?? "0") === "0",
    publicSalesDisabled: String(env.NEXT_PUBLIC_SALES_ENABLED ?? "0") === "0",
    supplierLiveImportDisabled: String(env.REAL_SUPPLIER_LIVE_IMPORT ?? "0") === "0",
    supplierDryRunEnabled: String(env.REAL_SUPPLIER_DRY_RUN ?? "1") === "1",
    productionLock:
      env.PRODUCTION_SAFETY_LOCK === undefined || safeBoolean(env.PRODUCTION_SAFETY_LOCK),
  };
  const ready = Object.values(checks).every(Boolean);
  return {
    status: ready ? PART27_STATUS.READY : PART27_STATUS.BLOCKED,
    checks,
    diagnosticOnly: true,
  };
}

function evaluateSupplierSafety() {
  const connector = createConnectorFromEnv().getStatus();
  const flags = getEffectiveFlags();
  const safe =
    !connector.credentialsConfigured &&
    !connector.liveImportEnabled &&
    !flags.supplierOrdersEnabled;
  return {
    status: safe ? PART27_STATUS.READY : PART27_STATUS.BLOCKED,
    credentialsConfigured: connector.credentialsConfigured,
    liveImportEnabled: connector.liveImportEnabled,
    supplierOrdersBlocked: !flags.supplierOrdersEnabled,
    connected: false,
    diagnosticOnly: true,
  };
}

function evaluateCommerceSafety() {
  const flags = getEffectiveFlags();
  const safe =
    !flags.salesEnabled &&
    !flags.paymentEnabled &&
    !flags.stripeEnabled &&
    !flags.paypalEnabled &&
    goLiveApproval.PRODUCTION_SAFETY_LOCK;
  return {
    status: safe ? PART27_STATUS.READY : PART27_STATUS.BLOCKED,
    salesEnabled: flags.salesEnabled,
    paymentEnabled: flags.paymentEnabled,
    stripeEnabled: flags.stripeEnabled,
    paypalEnabled: flags.paypalEnabled,
    productionSafetyLock: goLiveApproval.PRODUCTION_SAFETY_LOCK,
    diagnosticOnly: true,
  };
}

function buildPart27Readiness(input = {}) {
  const environmentSafety = input.environmentSafety || evaluateEnvironmentSafety();
  const supplierSafety = input.supplierSafety || evaluateSupplierSafety();
  const commerceSafety = input.commerceSafety || evaluateCommerceSafety();
  const config = configurationValidation.validateConfiguration();

  const gates = {};
  for (const gate of PART27_GATES) {
    if (gate === "environmentSafety") {
      gates[gate] = environmentSafety;
      continue;
    }
    if (gate === "supplierSafety") {
      gates[gate] = supplierSafety;
      continue;
    }
    if (gate === "commerceSafety") {
      gates[gate] = commerceSafety;
      continue;
    }
    if (gate === "configuration") {
      gates[gate] = {
        status: config.ok ? PART27_STATUS.READY : PART27_STATUS.BLOCKED,
        diagnosticOnly: true,
      };
      continue;
    }
    if (gate === "goLiveApproval") {
      gates[gate] = {
        status: PART27_STATUS.BLOCKED,
        reason: "explicit human go-live approval required",
        diagnosticOnly: true,
        autoActivate: false,
      };
      continue;
    }
    gates[gate] = {
      status: input.gates?.[gate]?.status || PART27_STATUS.CONDITION,
      diagnosticOnly: true,
    };
  }

  const blocked = Object.values(gates).some(
    (gate) => gate.status === PART27_STATUS.BLOCKED
  );

  return {
    part: 27,
    status: blocked ? PART27_STATUS.BLOCKED : PART27_STATUS.CONDITION,
    ready: false,
    diagnosticOnly: true,
    autoActivate: false,
    salesEnabled: false,
    supplierLive: false,
    gates,
    safety: {
      supplierOrdersBlocked: true,
      liveImport: false,
      publish: false,
      sales: false,
      payments: false,
    },
  };
}

function buildPart27Audit(readiness) {
  return {
    part: 27,
    diagnosticOnly: true,
    autoActivate: false,
    secretsExposed: false,
    readinessStatus: readiness.status,
    findings: [],
  };
}

module.exports = {
  evaluateEnvironmentSafety,
  buildPart27Readiness,
  buildPart27Audit,
  evaluateSupplierSafety,
  evaluateCommerceSafety,
};
