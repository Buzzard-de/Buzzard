/**
 * Part 19 — Fail-closed guards for customer mutation paths when sales OFF.
 */
const salesGuard = require("../commerce/salesGuard");
const { getEffectiveFlags } = require("../commerce/commerceFeatureFlags");
const goLiveApproval = require("../commerce/goLiveApproval");
const { isSalesEnabled } = require("../salesMode");

function assertCustomerMutationAllowed({ req, action = "customer_mutation" } = {}) {
  const flags = getEffectiveFlags();
  if (!flags.salesEnabled) {
    return {
      blocked: true,
      code: "sales_disabled",
      message: "Customer mutations requiring sales are disabled (catalog mode)",
      status: 403,
      action,
      failClosed: true,
    };
  }
  return salesGuard.assertCommercialTransactionAllowed({ req }) || null;
}

function assertReturnRequestAllowed({ req, dryRunReadiness = true } = {}) {
  if (!isSalesEnabled()) {
    if (dryRunReadiness) {
      return {
        blocked: true,
        code: "return_readiness_only",
        message: "Return requests are architecture-ready only while sales are disabled",
        status: 403,
        failClosed: true,
      };
    }
  }
  return assertCustomerMutationAllowed({ req, action: "return_request" });
}

function assertRealRefundAllowed({ req } = {}) {
  const paymentBlock = salesGuard.assertPaymentAllowed({ req });
  if (paymentBlock) return paymentBlock;
  return assertCustomerMutationAllowed({ req, action: "refund" });
}

function getMutationGuardReadiness() {
  const flags = getEffectiveFlags();
  const commercialBlock = salesGuard.assertCommercialTransactionAllowed({});
  const paymentBlock = salesGuard.assertPaymentAllowed({});
  const supplierBlock = salesGuard.assertSupplierOrderAllowed({});

  return {
    salesEnabled: flags.salesEnabled,
    goLiveLock: goLiveApproval.PRODUCTION_SAFETY_LOCK,
    mockPaymentOnly: flags.mockPaymentOnly,
    commercialBlocked: Boolean(commercialBlock?.blocked ?? commercialBlock),
    paymentBlocked: Boolean(paymentBlock?.blocked ?? paymentBlock),
    supplierBlocked: Boolean(supplierBlock?.blocked ?? supplierBlock),
    realRefundAllowed: false,
    realOrderCreateAllowed: false,
    failClosed: true,
  };
}

module.exports = {
  assertCustomerMutationAllowed,
  assertReturnRequestAllowed,
  assertRealRefundAllowed,
  getMutationGuardReadiness,
};
