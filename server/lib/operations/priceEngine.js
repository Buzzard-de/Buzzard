/**
 * Part 17 — Deterministic price engine (no auto-publish, no invented supplier data).
 */
function roundMoney(amount) {
  return Math.round(Number(amount) * 100) / 100;
}

function calculateSellingPrice({
  supplierNetPrice,
  shippingCost = 0,
  fees = 0,
  taxRate = 0,
  targetMargin = 0.3,
  minimumMargin = 0.12,
} = {}) {
  const net = Number(supplierNetPrice);
  if (!Number.isFinite(net) || net <= 0) {
    return {
      ok: false,
      code: "INVALID_SUPPLIER_PRICE",
      blockingReasons: ["SUPPLIER_PRICE_MISSING_OR_INVALID"],
    };
  }

  const shipping = Number(shippingCost) || 0;
  const feeAmount = Number(fees) || 0;
  const tax = Number(taxRate) || 0;

  if (shipping < 0 || feeAmount < 0 || tax < 0) {
    return { ok: false, code: "INVALID_COST_INPUT" };
  }

  const costBasis = net + shipping + feeAmount;
  const margin = Number(targetMargin);
  const minMargin = Number(minimumMargin);

  if (!Number.isFinite(margin) || margin <= 0 || margin >= 1) {
    return { ok: false, code: "INVALID_TARGET_MARGIN" };
  }

  let sellingPrice = costBasis / (1 - margin);
  if (tax > 0) {
    sellingPrice = sellingPrice * (1 + tax);
  }

  sellingPrice = roundMoney(sellingPrice);
  const marginAmount = roundMoney(sellingPrice - costBasis);
  const marginPercent = sellingPrice > 0 ? roundMoney((marginAmount / sellingPrice) * 100) : 0;

  if (marginPercent / 100 < minMargin) {
    return {
      ok: false,
      code: "MARGIN_BELOW_MINIMUM",
      costBasis: roundMoney(costBasis),
      marginPercent,
      minimumMargin: minMargin * 100,
    };
  }

  return {
    ok: true,
    supplierNetPrice: roundMoney(net),
    shippingCost: roundMoney(shipping),
    fees: roundMoney(feeAmount),
    taxRate: tax,
    costBasis: roundMoney(costBasis),
    sellingPrice,
    margin: marginAmount,
    marginPercent,
    autoPublish: false,
    note: "Calculated price is not auto-published — manual review required",
  };
}

module.exports = {
  calculateSellingPrice,
  roundMoney,
};
