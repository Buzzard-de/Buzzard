const { SUPPLIER_RECOVERY_STATUS } = require("./constants");

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

/**
 * Customer refund calculation — NEVER uses supplier refund amounts.
 */
function calculateCustomerRefund(returnCase) {
  const currency = returnCase.currency || "EUR";
  const unitPrice = Number(returnCase.unitPrice || returnCase.productPrice || 0);
  const quantity = Number(returnCase.quantity || 1);
  const productRefundAmount = roundMoney(unitPrice * quantity);
  const shippingRefundAmount = roundMoney(
    returnCase.customerShippingRefund ?? returnCase.shippingRefundAmount ?? 0
  );
  const otherApprovedRefunds = roundMoney(returnCase.otherApprovedRefunds || 0);
  const deductionAmount = roundMoney(returnCase.deductionAmount || 0);

  const gross = productRefundAmount + shippingRefundAmount + otherApprovedRefunds;
  const totalRefundAmount = roundMoney(Math.max(0, gross - deductionAmount));

  return {
    productRefundAmount,
    shippingRefundAmount,
    otherApprovedRefunds,
    deductionAmount,
    totalRefundAmount,
    currency,
    status: totalRefundAmount > 0 ? "CALCULATED" : "ZERO",
  };
}

module.exports = { calculateCustomerRefund, roundMoney };
