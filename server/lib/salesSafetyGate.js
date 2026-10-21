/**
 * Commercial sales may enable only when every P0 condition is true.
 * Default: LOCKED. Does not invent LIVE integrations.
 */
const { MODE } = require("./integrationMode");

function flag(name) {
  return process.env[name] === "1";
}

function evaluateSalesGate() {
  const conditions = {
    PRODUCT_SOT_ACTIVE: flag("BUZZARD_PRODUCT_SOT_ACTIVE"),
    PAYMENT_LIVE: flag("BUZZARD_PAYMENT_LIVE"),
    SUPPLIER_LIVE: flag("BUZZARD_SUPPLIER_LIVE"),
    FULFILLMENT_LIVE: flag("BUZZARD_FULFILLMENT_LIVE"),
    TRACKING_LIVE: flag("BUZZARD_TRACKING_LIVE"),
    RETURN_LIVE: flag("BUZZARD_RETURN_LIVE"),
    REFUND_LIVE: flag("BUZZARD_REFUND_LIVE"),
    CRITICAL_E2E_PASS: flag("BUZZARD_CRITICAL_E2E_PASS"),
    SECURITY_GATE_PASS: flag("BUZZARD_SECURITY_GATE_PASS"),
    PUSAT_RUNTIME_HEALTHY: flag("PUSAT_RUNTIME_HEALTHY"),
  };

  const failed = Object.entries(conditions)
    .filter(([, ok]) => !ok)
    .map(([name]) => name);

  const envWantsSales = flag("BUZZARD_SALES_ENABLED");
  const allowed = failed.length === 0 && envWantsSales;

  return {
    allowed,
    locked: !allowed,
    status: allowed ? "READY" : "LOCKED",
    mode: allowed ? MODE.LIVE : MODE.DISABLED,
    conditions,
    failed,
    envWantsSales,
    message: allowed
      ? "All sales P0 conditions true"
      : `Sales gate locked: ${failed.join(", ") || "sales env not fully set"}`,
  };
}

function assertSalesGate() {
  const gate = evaluateSalesGate();
  if (!gate.allowed) {
    const err = new Error(gate.message);
    err.code = "sales_gate_locked";
    err.details = gate;
    throw err;
  }
  return gate;
}

module.exports = { evaluateSalesGate, assertSalesGate };
