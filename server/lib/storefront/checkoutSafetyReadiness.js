/**
 * Part 18 — Cart / checkout readiness (fail-closed while sales OFF).
 */
const { getEffectiveFlags } = require("../commerce/commerceFeatureFlags");
const goLiveApproval = require("../commerce/goLiveApproval");
const salesGuard = require("../commerce/salesGuard");

function getCheckoutSafetyReadiness() {
  const flags = getEffectiveFlags();
  const salesBlock = salesGuard.assertCommercialTransactionAllowed({});
  const paymentBlock = salesGuard.assertPaymentAllowed({});
  const supplierBlock = salesGuard.assertSupplierOrderAllowed({});

  return {
    flow: "PRODUCT → CART → CHECKOUT → PAYMENT",
    salesEnabled: flags.salesEnabled,
    checkoutDryRunOnly: flags.checkoutDryRunOnly,
    mockPaymentOnly: flags.mockPaymentOnly,
    stripeEnabled: flags.stripeEnabled,
    paypalEnabled: flags.paypalEnabled,
    supplierOrdersEnabled: flags.supplierOrdersEnabled,
    goLiveLock: goLiveApproval.PRODUCTION_SAFETY_LOCK,
    commercialTransactionBlocked: Boolean(salesBlock?.blocked ?? salesBlock),
    paymentBlocked: Boolean(paymentBlock?.blocked ?? paymentBlock),
    supplierOrderBlocked: Boolean(supplierBlock?.blocked ?? supplierBlock),
    realCheckoutCompletes: false,
    realPaymentProcesses: false,
    supplierOrdersExecute: false,
    failClosed: true,
  };
}

module.exports = {
  getCheckoutSafetyReadiness,
};
