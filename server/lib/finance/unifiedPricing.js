/**
 * Unified quote: estimated vs actual profit; refunds ≠ supplier reimbursements.
 */
const { quote, MIN_NET, UNDERCUT, MARGIN } = require("../buzzardNative/core/specialists/pricingEngine");

function calculate(input = {}) {
  const base = quote(input);
  if (!base.ok) return { ...base, estimatedProfit: null, actualProfit: null };
  return {
    ...base,
    estimatedProfit: base.net,
    actualProfit: null,
    customerRefund: 0,
    supplierReimbursement: 0,
    supplierReimbursementAssumed: false,
    livePublish: false,
  };
}

function applyCustomerRefund({ estimatedProfit, refund }) {
  const est = Number(estimatedProfit) || 0;
  const r = Number(refund) || 0;
  return {
    estimatedProfit: est,
    actualProfit: Number((est - r).toFixed(4)),
    customerRefund: r,
    supplierReimbursement: 0,
    supplierReimbursementAssumed: false,
  };
}

module.exports = { calculate, applyCustomerRefund, MIN_NET, UNDERCUT, MARGIN };
