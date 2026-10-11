/**
 * Canonical price quote. Wraps server/lib/pricing.js.
 * Does not add the €0.10 undercut rule.
 * Missing supplier cost or tax/commission inputs do not invent certainty.
 */

const pricing = require("../pricing");
const { MIN_NET_PROFIT_EUR, MARKET_UNDERCUT_IMPLEMENTED, MARKET_UNDERCUT_EUR } = require("../pusat/constants");

function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}

function quote(input = {}) {
  const supplierCost = money(input.supplierCost ?? input.supplierPrice);
  if (supplierCost == null || supplierCost <= 0) {
    return {
      ok: false,
      failClosed: true,
      engine: "server/lib/pricing.js",
      reason: "MISSING_SUPPLIER_COST",
      invented: false,
      marketUndercutImplemented: MARKET_UNDERCUT_IMPLEMENTED,
    };
  }

  const shippingCost = money(input.shippingCost) ?? 0;
  const extraCosts = money(input.extraCosts) ?? 0;
  const returnReserve = money(input.returnReserve);
  const commissionRate = input.marketplaceCommissionRate != null ? Number(input.marketplaceCommissionRate) : null;
  const taxRate = input.taxRate != null ? Number(input.taxRate) : null;
  const missingOptional = [];
  if (returnReserve == null) missingOptional.push("returnReserve");
  if (commissionRate == null || !Number.isFinite(commissionRate)) missingOptional.push("marketplaceCommissionRate");
  if (taxRate == null || !Number.isFinite(taxRate)) missingOptional.push("taxRate");

  const base = pricing.calculateSalePrice({
    supplierPrice: supplierCost,
    markupPercent: input.markupPercent ?? 38,
    minimumMarginPercent: input.minimumMarginPercent ?? 12,
    currency: input.currency || "EUR",
  });

  const landed = money(supplierCost + shippingCost + extraCosts + (returnReserve || 0));
  const sale = money(Math.max(base.amount, landed + MIN_NET_PROFIT_EUR));
  const netBeforeOptional = money(sale - landed);
  const commission = commissionRate != null ? money(sale * commissionRate) : null;
  const tax = taxRate != null ? money(sale * taxRate) : null;
  const net =
    commission != null && tax != null ? money(sale - landed - commission - tax) : null;

  const precise = missingOptional.length === 0 && net != null;
  const marginOk = pricing.meetsMinimumMargin({
    salePrice: sale,
    purchasePrice: supplierCost,
    minimumMarginPercent: input.minimumMarginPercent ?? 12,
  });

  return {
    ok: true,
    failClosed: false,
    engine: "server/lib/pricing.js",
    currency: input.currency || "EUR",
    supplierCost,
    shippingCost,
    extraCosts,
    returnReserve: returnReserve,
    marketplaceCommission: commission,
    tax,
    salePrice: sale,
    netProfit: net,
    netBeforeOptional,
    minNetProfitEur: MIN_NET_PROFIT_EUR,
    minMarginMet: marginOk,
    precise,
    missingOptional,
    invented: false,
    pythonPolicyNote: "Python MIN_NET_PROFIT=0.50 is documented separately and is not silently merged.",
    marketUndercut: { amountEur: MARKET_UNDERCUT_EUR, implemented: MARKET_UNDERCUT_IMPLEMENTED },
  };
}

module.exports = { quote };
