/**
 * Part 17 — Deterministic price engine (no auto-publish, no invented supplier data).
 * The category floor comes from the commercial pricing policy.
 * Omitted shipping, fees, or tax are missing. They are not treated as zero.
 */
function roundMoney(amount) {
  return Math.round(Number(amount) * 100) / 100;
}

function calculateSellingPrice({
  supplierNetPrice,
  shippingCost,
  fees,
  taxRate,
} = {}) {
  const net = Number(supplierNetPrice);
  if (!Number.isFinite(net) || net <= 0) {
    return {
      ok: false,
      code: "INVALID_SUPPLIER_PRICE",
      blockingReasons: ["SUPPLIER_PRICE_MISSING_OR_INVALID"],
      sellingPrice: null,
      autoPublish: false,
      invented: false,
    };
  }
  if (shippingCost == null || shippingCost === "" || fees == null || fees === "" || taxRate == null || taxRate === "") {
    return {
      ok: false,
      status: "BLOCKED",
      code: "MISSING_COST",
      sellingPrice: null,
      autoPublish: false,
      invented: false,
    };
  }

  const shipping = Number(shippingCost);
  const feeAmount = Number(fees);
  const tax = Number(taxRate);

  if (!Number.isFinite(shipping) || !Number.isFinite(feeAmount) || !Number.isFinite(tax) || shipping < 0 || feeAmount < 0 || tax < 0) {
    return { ok: false, code: "INVALID_COST_INPUT", sellingPrice: null, autoPublish: false, invented: false };
  }

  return {
    ok: false,
    live: false,
    status: "UNKNOWN",
    code: "SUPPLIER_COST_UNVERIFIED",
    commercialEligibility: "BLOCKED",
    supplierNetPrice: null,
    shippingCost: null,
    fees: null,
    taxRate: null,
    costBasis: null,
    sellingPrice: null,
    margin: null,
    marginPercent: null,
    autoPublish: false,
    invented: false,
    note: "A numeric supplier net is not a verified supplier cost",
  };
}

module.exports = {
  calculateSellingPrice,
  roundMoney,
};
