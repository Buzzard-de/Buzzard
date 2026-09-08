/**
 * Automotive Core — centralized price calculation (no public exposure when sales OFF).
 */
const { GLOBAL_SAFETY_POLICY } = require("../globalSafetyPolicy");

const SUPPORTED_CURRENCIES = ["EUR", "GBP", "CHF", "SEK", "NOK", "DKK", "PLN", "CZK", "HUF", "RON", "BGN"];

function calculatePrice(input = {}) {
  const supplierCost = Number(input.supplierCost || 0);
  const supplierShipping = Number(input.supplierShippingCost || 0);
  const supplierFees = Number(input.supplierFees || 0);
  const taxRate = Number(input.tax || 0);
  const paymentFees = Number(input.paymentFees || 0);
  const desiredMargin = Number(input.desiredMargin ?? 0.15);
  const minimumMargin = Number(input.minimumMargin ?? 0.05);
  const currency = input.currency || "EUR";

  const purchasePrice = supplierCost;
  const shippingCost = supplierShipping;
  const costBasis = purchasePrice + shippingCost + supplierFees + paymentFees;
  const grossMargin = desiredMargin;
  const rawCustomer = costBasis * (1 + grossMargin) * (1 + taxRate);
  const customerPrice = Math.round(rawCustomer * 100) / 100;
  const netMarginEstimate = costBasis > 0 ? (customerPrice - costBasis) / costBasis : 0;

  const salesEnabled =
    process.env.BUZZARD_SALES_ENABLED === "1" || process.env.NEXT_PUBLIC_SALES_ENABLED === "1";

  const negativeMargin = netMarginEstimate < minimumMargin;
  const blocked = !salesEnabled || GLOBAL_SAFETY_POLICY.salesEnabled || negativeMargin;

  return {
    purchasePrice,
    shippingCost,
    costBasis,
    grossMargin,
    netMarginEstimate,
    customerPrice: blocked ? null : customerPrice,
    currency,
    publicPriceAllowed: salesEnabled && !blocked,
    blocked,
    status: blocked ? (negativeMargin ? "REVIEW_REQUIRED" : "BLOCKED") : "CALCULATED",
    reason: blocked ? (salesEnabled ? "negative_margin" : "sales_disabled") : null,
  };
}

module.exports = {
  SUPPORTED_CURRENCIES,
  calculatePrice,
};
