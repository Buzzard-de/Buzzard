/**
 * Unified quote: estimated vs actual profit; refunds ≠ supplier reimbursements.
 */
const { quote, MIN_NET, UNDERCUT, MARGIN } = require("../buzzardNative/core/specialists/pricingEngine");

const seenRefunds = new Set();

function readMoney(value) {
  if (value == null || value === "") return { present: false, value: null };
  if (typeof value === "string" && value.trim().toUpperCase() === "UNKNOWN") return { present: false, value: null };
  const text = typeof value === "number" ? String(value) : String(value).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return { invalid: true };
  const amount = Number(text);
  if (!Number.isFinite(amount) || amount < 0) return { invalid: true };
  return { present: true, value: amount };
}

function blockedRefund(code, extra = {}) {
  return {
    ok: false,
    status: "BLOCKED_EXTERNAL",
    code,
    refunded: false,
    recorded: false,
    duplicate: false,
    estimatedProfit: null,
    actualProfit: null,
    customerRefund: null,
    requestedAmount: null,
    supplierReimbursement: null,
    supplierReimbursementAssumed: false,
    supplierReimbursementVerified: false,
    paymentVerified: false,
    currency: null,
    orderVerified: false,
    ownershipVerified: false,
    live: false,
    mock: false,
    ...extra,
  };
}

function calculate(input = {}) {
  const base = quote(input);
  if (!base.ok) return { ...base, estimatedProfit: null, actualProfit: null, customerRefund: null, supplierReimbursement: null };
  return {
    ...base,
    estimatedProfit: base.net,
    actualProfit: null,
    customerRefund: null,
    supplierReimbursement: null,
    supplierReimbursementAssumed: false,
    supplierReimbursementVerified: false,
    refunded: false,
    livePublish: false,
  };
}

function applyCustomerRefund(input = {}) {
  const profit = readMoney(input.estimatedProfit);
  const refund = readMoney(input.refund);
  const supplier = readMoney(input.supplierReimbursement);
  if (profit.invalid || refund.invalid || supplier.invalid) return blockedRefund("INVALID_AMOUNT");
  if (input.customerId != null && input.ownerId != null && String(input.customerId) !== String(input.ownerId)) {
    return blockedRefund("OWNERSHIP_UNVERIFIED");
  }
  if (input.currency != null && !/^[A-Z]{3}$/.test(String(input.currency))) return blockedRefund("INVALID_CURRENCY");
  if (input.mock === true || input.demo === true || input.source === "mock") return blockedRefund("MOCK_NOT_COMMERCIAL");
  const key = input.orderId ? `${input.orderId}:${input.customerId || ""}:${refund.present ? refund.value : "missing"}` : null;
  if (key && seenRefunds.has(key)) return blockedRefund("DUPLICATE_REFUND", { duplicate: true });
  if (key) seenRefunds.add(key);
  return blockedRefund("PROVIDER_NOT_LIVE", {
    estimatedProfit: profit.present ? profit.value : null,
    requestedAmount: refund.present ? refund.value : null,
    currency: input.currency ? String(input.currency) : null,
  });
}

module.exports = { calculate, applyCustomerRefund, MIN_NET, UNDERCUT, MARGIN };
