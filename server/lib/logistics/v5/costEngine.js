/**
 * Logistics cost model. Unknown amounts are never treated as live prices.
 */
function quoteCost({ carrierId, country, weightKg, liveRate } = {}) {
  return {
    carrierId: carrierId || "UNKNOWN",
    country: country || "UNKNOWN",
    weightKg: weightKg == null ? "UNKNOWN" : weightKg,
    base: "UNKNOWN",
    fuelSurcharge: "UNKNOWN",
    remoteSurcharge: "UNKNOWN",
    heavySurcharge: "UNKNOWN",
    volumeSurcharge: "UNKNOWN",
    pickupFee: "UNKNOWN",
    returnFee: "UNKNOWN",
    customsFee: "UNKNOWN",
    insurance: "UNKNOWN",
    extras: "UNKNOWN",
    vat: "UNKNOWN",
    total: "UNKNOWN",
    liveRate: liveRate === true,
    estimateIsNotPrice: liveRate !== true,
    invoiceVariance: "UNKNOWN",
  };
}

function metricsTemplate() {
  return {
    averageShippingCost: "UNKNOWN",
    costPerCountry: "UNKNOWN",
    costPerCarrier: "UNKNOWN",
    costPerProductCategory: "UNKNOWN",
    returnShippingCost: "UNKNOWN",
    costPerDelivery: "UNKNOWN",
    carrierPerformance: "UNKNOWN",
    shippingCostVariance: "UNKNOWN",
    dataClass: "STRUCTURE_ONLY_NOT_LIVE",
  };
}

module.exports = { quoteCost, metricsTemplate };
