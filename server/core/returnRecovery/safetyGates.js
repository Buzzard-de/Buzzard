/**
 * Return Recovery safety gates — reuses existing production/supplier gates (fail-closed).
 */
const { checkProductionSafety } = require("../../lib/pim/productionSafetyGate");
const { assertSupplierOperation } = require("../../lib/supplier/supplierSafetyGate");

function isPaymentsEnabled() {
  return (
    process.env.BUZZARD_PAYMENTS_ENABLED === "1" ||
    process.env.BUZZARD_PAYMENTS_FINANCE === "1" ||
    process.env.BUZZARD_PAYMENTS_V36 === "1" ||
    process.env.STRIPE_ENABLED === "1" ||
    process.env.BUZZARD_STRIPE_ENABLED === "1"
  );
}

function isSupplierLiveEnabled() {
  const liveImport = process.env.REAL_SUPPLIER_LIVE_IMPORT === "1";
  const supplierOrders = process.env.BUZZARD_SUPPLIER_ORDERS_ENABLED === "1";
  const sales = process.env.BUZZARD_SALES_ENABLED === "1";
  return liveImport && supplierOrders && sales;
}

function assertRefundExecutionAllowed() {
  if (!isPaymentsEnabled()) {
    return {
      blocked: true,
      code: "REFUND_EXECUTION_BLOCKED",
      message: "Customer refund execution blocked — PAYMENTS_ENABLED is false",
      diagnosticOnly: true,
    };
  }
  const safety = checkProductionSafety();
  if (!safety.ok) {
    return {
      blocked: true,
      code: "REFUND_EXECUTION_BLOCKED",
      message: `Production safety blocked refund: ${safety.issues.join("; ")}`,
      diagnosticOnly: true,
    };
  }
  return { blocked: false };
}

function assertSupplierLiveAllowed({ dryRun = true } = {}) {
  if (!isSupplierLiveEnabled() || dryRun) {
    return {
      blocked: true,
      code: "SUPPLIER_LIVE_DISABLED",
      message: "Supplier live API blocked — SUPPLIER_LIVE is false",
      diagnosticOnly: true,
    };
  }
  const result = assertSupplierOperation("supplier_recovery", { dryRun: false });
  if (!result.ok) {
    return {
      blocked: true,
      code: "SUPPLIER_LIVE_DISABLED",
      message: result.issues.map((i) => i.reason).join("; "),
      diagnosticOnly: true,
    };
  }
  return { blocked: false };
}

function getSafetyStatus() {
  const production = checkProductionSafety();
  return {
    salesEnabled: process.env.BUZZARD_SALES_ENABLED === "1",
    paymentsEnabled: isPaymentsEnabled(),
    supplierLiveEnabled: isSupplierLiveEnabled(),
    liveImportEnabled: process.env.REAL_SUPPLIER_LIVE_IMPORT === "1",
    publishEnabled: process.env.BUZZARD_PUBLISH_ENABLED === "1",
    autoActivationEnabled: process.env.BUZZARD_AUTO_ACTIVATION === "1",
    goLiveBlocked: production.ok,
    productionSafety: production,
    diagnosticOnly: true,
    dryRunDefault: true,
  };
}

module.exports = {
  isPaymentsEnabled,
  isSupplierLiveEnabled,
  assertRefundExecutionAllowed,
  assertSupplierLiveAllowed,
  getSafetyStatus,
};
