const { roundMoney } = require("./customerRefundEngine");
const { sumConfirmedRecovery } = require("./supplierRecoveryEngine");
const { SUPPLIER_RECOVERY_STATUS } = require("./constants");

/**
 * Financial reconciliation — uses CONFIRMED supplier recovery only.
 */
function reconcileReturn(returnCase) {
  const currency = returnCase.currency || "EUR";
  const customerRefundAmount = roundMoney(
    returnCase.customerRefundAmount ??
      returnCase.customerRefund?.totalRefundAmount ??
      0
  );

  const events = returnCase.supplierRecoveryEvents || [];
  const supplierRecoveryExpected = roundMoney(
    returnCase.supplierRecoveryExpected ??
      returnCase.supplierRecovery?.totalExpectedRecovery ??
      0
  );
  const supplierRecoveryConfirmed = sumConfirmedRecovery(events);

  const supplierRecoveryStatus =
    returnCase.supplierRecoveryStatus ||
    returnCase.supplierRecovery?.status ||
    SUPPLIER_RECOVERY_STATUS.PENDING;

  const unrecoveredApprovedCosts = roundMoney(returnCase.unrecoveredApprovedCosts || 0);
  const buzzardLiabilityCosts = roundMoney(returnCase.buzzardLiabilityCosts || 0);

  let unrecoveredAmount;
  if (supplierRecoveryConfirmed <= 0 && supplierRecoveryStatus !== SUPPLIER_RECOVERY_STATUS.CONFIRMED) {
    unrecoveredAmount = roundMoney(customerRefundAmount + unrecoveredApprovedCosts + buzzardLiabilityCosts);
  } else {
    unrecoveredAmount = roundMoney(
      Math.max(0, customerRefundAmount - supplierRecoveryConfirmed) +
        unrecoveredApprovedCosts +
        buzzardLiabilityCosts
    );
  }

  const buzzardNetImpact = roundMoney(
    customerRefundAmount -
      supplierRecoveryConfirmed +
      unrecoveredApprovedCosts +
      buzzardLiabilityCosts
  );

  return {
    customerRefund: customerRefundAmount,
    supplierRecoveryExpected,
    supplierRecoveryConfirmed,
    unrecoveredAmount,
    buzzardNetImpact,
    currency,
    status: supplierRecoveryStatus,
    customerRefundAmount,
    supplierRecoveryStatus,
  };
}

module.exports = { reconcileReturn };
