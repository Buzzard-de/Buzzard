/**
 * Explicit pricing/profit contract. Does not replace server/lib/pricing.js.
 * Agricultural offer previews apply the existing sale formula, then enforce
 * a minimum net profit of EUR 0.50 without changing the shared engine.
 */

const pricing = require("../pricing");

const MIN_NET_PROFIT_EUR = 0.5;

function previewSalePrice({ supplierPrice, markupPercent, minimumMarginPercent, currency = "EUR" } = {}) {
  const purchase = Number(supplierPrice) || 0;
  const base = pricing.calculateSalePrice({
    supplierPrice: purchase,
    markupPercent,
    minimumMarginPercent,
    currency,
  });
  const net = Math.round((base.amount - purchase) * 100) / 100;
  let amount = base.amount;
  let minNetApplied = false;
  if (purchase > 0 && net < MIN_NET_PROFIT_EUR) {
    amount = Math.round((purchase + MIN_NET_PROFIT_EUR) * 100) / 100;
    minNetApplied = true;
  }
  return {
    amount,
    currency: base.currency || currency,
    purchase,
    netProfit: Math.round((amount - purchase) * 100) / 100,
    minNetProfitEur: MIN_NET_PROFIT_EUR,
    minNetApplied,
    pricingEngine: "server/lib/pricing.js",
    marginOk: pricing.meetsMinimumMargin({
      salePrice: amount,
      purchasePrice: purchase,
      minimumMarginPercent: minimumMarginPercent ?? 12,
    }),
  };
}

module.exports = {
  MIN_NET_PROFIT_EUR,
  previewSalePrice,
  calculateSalePrice: pricing.calculateSalePrice,
  meetsMinimumMargin: pricing.meetsMinimumMargin,
};
