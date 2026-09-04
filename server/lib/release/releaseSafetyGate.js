/**
 * Part 24 — Release safety gate (does not activate sales/supplier/payments).
 */
const FALSE_VALUES = new Set(["0", "false", "off", "disabled"]);

function isFalse(value) {
  return FALSE_VALUES.has(String(value ?? "").trim().toLowerCase());
}

function evaluateReleaseSafety(env = process.env, runtime = {}) {
  const salesDisabled =
    isFalse(env.BUZZARD_SALES_ENABLED) &&
    isFalse(env.NEXT_PUBLIC_SALES_ENABLED);
  const lockActive =
    String(env.PRODUCTION_SAFETY_LOCK ?? "").toLowerCase() === "true" ||
    runtime.productionSafetyLock === true;
  const liveImportDisabled = isFalse(env.REAL_SUPPLIER_LIVE_IMPORT);
  const dryRunEnabled =
    String(env.REAL_SUPPLIER_DRY_RUN ?? "").trim() === "1" ||
    String(env.REAL_SUPPLIER_DRY_RUN ?? "").toLowerCase() === "true";
  const supplierBlocked =
    runtime.supplierOrdersBlocked === true ||
    runtime.supplierOrdersBlocked === undefined;
  const stripeOff =
    runtime.stripeEnabled === false ||
    runtime.stripeEnabled === undefined;
  const paypalOff =
    runtime.paypalEnabled === false ||
    runtime.paypalEnabled === undefined;

  const safe =
    salesDisabled &&
    lockActive &&
    liveImportDisabled &&
    dryRunEnabled &&
    supplierBlocked &&
    stripeOff &&
    paypalOff;

  return {
    status: safe ? "PASS" : "FAIL",
    salesDisabled,
    productionSafetyLock: lockActive,
    liveSupplierImportDisabled: liveImportDisabled,
    supplierDryRun: dryRunEnabled,
    supplierOrdersBlocked: supplierBlocked,
    stripeOff,
    paypalOff,
    autoActivate: false,
  };
}

module.exports = {
  evaluateReleaseSafety,
  isFalse,
};
