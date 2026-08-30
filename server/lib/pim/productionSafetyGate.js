/**
 * Part 15 — Production safety gate before catalog import/publish writes.
 * Stops if commercial sales, payments, or go-live lock preconditions are violated.
 */
const goLiveApproval = require("../commerce/goLiveApproval");

function checkProductionSafety() {
  const issues = [];

  if (process.env.BUZZARD_SALES_ENABLED === "1") {
    issues.push("BUZZARD_SALES_ENABLED must remain 0");
  }
  if (process.env.NEXT_PUBLIC_SALES_ENABLED === "1") {
    issues.push("NEXT_PUBLIC_SALES_ENABLED must remain 0");
  }
  if (process.env.STRIPE_ENABLED === "1" || process.env.BUZZARD_STRIPE_ENABLED === "1") {
    issues.push("Stripe must remain disabled");
  }
  if (process.env.PAYPAL_ENABLED === "1" || process.env.BUZZARD_PAYPAL_ENABLED === "1") {
    issues.push("PayPal must remain disabled");
  }
  if (process.env.BUZZARD_SUPPLIER_ORDERS_ENABLED === "1") {
    issues.push("Supplier orders must remain blocked");
  }
  if (!goLiveApproval.PRODUCTION_SAFETY_LOCK) {
    issues.push("Go-Live Lock must remain ACTIVE");
  }

  return {
    ok: issues.length === 0,
    issues,
    salesEnabled: process.env.BUZZARD_SALES_ENABLED === "1",
    goLiveLock: goLiveApproval.PRODUCTION_SAFETY_LOCK,
  };
}

function assertProductionSafety() {
  const result = checkProductionSafety();
  if (!result.ok) {
    const err = new Error(`Production safety check failed: ${result.issues.join("; ")}`);
    err.code = "production_safety_blocked";
    err.details = result;
    throw err;
  }
  return result;
}

module.exports = { checkProductionSafety, assertProductionSafety };
