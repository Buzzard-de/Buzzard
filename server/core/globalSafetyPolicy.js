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

  return {
    ...GLOBAL_SAFETY_POLICY,
    salesOff,
    supplierDry,
    compliant: salesOff && supplierDry,
  };
}

module.exports = {
  GLOBAL_SAFETY_POLICY,
  assertGlobalSafetyPolicy,
};
