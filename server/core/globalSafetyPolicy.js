/**
 * Global localization safety contract — fail-closed, no activation.
 * Integrates with Parts 28–35 governance semantics.
 */
const GLOBAL_SAFETY_POLICY = Object.freeze({
  ready: false,
  status: "BLOCKED",
  diagnosticOnly: true,
  autoActivate: false,
  activationAllowed: false,
  supplierLive: false,
  salesEnabled: false,
  paymentsEnabled: false,
  publishEnabled: false,
  tecdocLive: false,
  orderLive: false,
  humanApprovalRequired: true,
  publishBlocked: true,
  liveImport: false,
  dryRun: true,
});

function assertGlobalSafetyPolicy() {
  const salesOff =
    process.env.BUZZARD_SALES_ENABLED !== "1" &&
    process.env.NEXT_PUBLIC_SALES_ENABLED !== "1";
  const supplierDry =
    process.env.REAL_SUPPLIER_LIVE_IMPORT !== "1" &&
    process.env.REAL_SUPPLIER_DRY_RUN !== "0";
  const tecdocOff = process.env.TECDOC_ENABLED !== "1";
  const orderOff = process.env.ORDER_LIVE_ENABLED !== "1";

  return {
    ...GLOBAL_SAFETY_POLICY,
    salesOff,
    supplierDry,
    tecdocOff,
    orderOff,
    compliant: salesOff && supplierDry && tecdocOff && orderOff,
  };
}

module.exports = {
  GLOBAL_SAFETY_POLICY,
  assertGlobalSafetyPolicy,
};
