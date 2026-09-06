const { SUPPLIER_RECOVERY_STATUS, LIABILITY_TYPES } = require("./constants");
const { determineLiability } = require("./liabilityEngine");
const { roundMoney } = require("./customerRefundEngine");

function sumConfirmedRecovery(events = []) {
  return roundMoney(
    events.reduce((sum, event) => sum + Number(event.confirmedAmount || 0), 0)
  );
}

function deriveRecoveryStatus(events = [], liability) {
  if (liability === LIABILITY_TYPES.CUSTOMER) {
    return SUPPLIER_RECOVERY_STATUS.NOT_APPLICABLE;
  }
  if (!events.length) {
    return SUPPLIER_RECOVERY_STATUS.PENDING;
  }
  const requested = events.reduce((s, e) => s + Number(e.requestedAmount || 0), 0);
  const confirmed = sumConfirmedRecovery(events);
  if (confirmed <= 0) {
    const hasRequested = events.some((e) => e.status === "REQUESTED");
    return hasRequested ? SUPPLIER_RECOVERY_STATUS.REQUESTED : SUPPLIER_RECOVERY_STATUS.PENDING;
  }
  if (confirmed < requested) {
    return SUPPLIER_RECOVERY_STATUS.PARTIALLY_CONFIRMED;
  }
  if (events.some((e) => e.status === "DISPUTED")) {
    return SUPPLIER_RECOVERY_STATUS.DISPUTED;
  }
  if (events.every((e) => e.status === "REJECTED")) {
    return SUPPLIER_RECOVERY_STATUS.REJECTED;
  }
  return SUPPLIER_RECOVERY_STATUS.CONFIRMED;
}

/**
 * Supplier recovery calculation — separate from customer refund.
 */
function calculateSupplierRecovery(returnCase) {
  const currency = returnCase.currency || "EUR";
  const liability = determineLiability(returnCase.reason);
  const events = returnCase.supplierRecoveryEvents || [];

  const unitPrice = Number(returnCase.unitPrice || returnCase.productPrice || 0);
  const quantity = Number(returnCase.quantity || 1);
  const baseProduct = roundMoney(unitPrice * quantity);

  const hasInspection = returnCase.inspection != null;
  const supplierLiable = liability.supplierLiability === LIABILITY_TYPES.SUPPLIER;

  const supplierRefundRequested =
    returnCase.supplierRefundRequested === true ||
    (supplierLiable && !hasInspection) ||
    (supplierLiable && hasInspection && returnCase.inspection.resellable === false);
  const supplierCreditRequested =
    returnCase.supplierCreditRequested === true ||
    (supplierLiable && hasInspection && returnCase.inspection.resellable === true);

  let supplierRefundAmount = 0;
  let supplierCreditAmount = 0;

  if (supplierRefundRequested) {
    supplierRefundAmount = roundMoney(
      Number(returnCase.supplierRefundAmount) > 0
        ? returnCase.supplierRefundAmount
        : baseProduct
    );
  }
  if (supplierCreditRequested) {
    supplierCreditAmount = roundMoney(
      Number(returnCase.supplierCreditAmount) > 0
        ? returnCase.supplierCreditAmount
        : baseProduct
    );
  }

  const shippingRecoveryAmount = roundMoney(returnCase.supplierShippingRecovery || 0);
  const returnShippingRecoveryAmount = roundMoney(
    returnCase.supplierReturnShippingRecovery || 0
  );

  const totalExpectedRecovery = roundMoney(
    supplierRefundAmount +
      supplierCreditAmount +
      shippingRecoveryAmount +
      returnShippingRecoveryAmount
  );

  const confirmedRecovery = sumConfirmedRecovery(events);
  const status = deriveRecoveryStatus(events, liability.supplierLiability);

  return {
    supplierRefundRequested,
    supplierRefundAmount,
    supplierCreditRequested,
    supplierCreditAmount,
    shippingRecoveryAmount,
    returnShippingRecoveryAmount,
    totalExpectedRecovery,
    confirmedRecovery,
    currency,
    liability: liability.supplierLiability,
    decisionStatus: liability.decisionStatus,
    status,
  };
}

module.exports = {
  calculateSupplierRecovery,
  sumConfirmedRecovery,
  deriveRecoveryStatus,
};
