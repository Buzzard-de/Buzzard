/**
 * Part 19 — Returns / refunds readiness (fail-closed, no real money movement).
 */
const returnsRma = require("../returnsRma");
const customerMutationGuard = require("./customerMutationGuard");

function getReturnRefundReadiness() {
  const guard = customerMutationGuard.getMutationGuardReadiness();
  return {
    rmaModuleEnabled: returnsRma.isEnabled(),
    customerReturnRoute: "POST /api/returns-rma/returns",
    failClosedWhileSalesOff: true,
    realRefundExecution: false,
    refundNote: "REFUND_UNVERIFIED until a verified payment and a real refund proof exist",
    realMoneyMovement: false,
    ...guard,
  };
}

module.exports = {
  getReturnRefundReadiness,
};
