import type { PriceSnapshot, PricingResult } from "./types";

/** Create immutable order-time price snapshot from a pricing result. */
export function createPriceSnapshot(result: PricingResult): PriceSnapshot {
  return {
    snapshotId: `price_${result.productId}_${result.marketId}_${result.channel}_${Date.now()}`,
    productId: result.productId,
    supplierId: result.supplierId,
    supplierOfferId: result.supplierOfferId,
    marketId: result.marketId,
    channel: result.channel,
    currency: result.currency,
    supplierCost: result.supplierNetPrice,
    shippingCost: result.shippingCost,
    marketplaceFee: result.marketplaceFee,
    paymentFee: result.paymentFee,
    returnCostReserve: result.returnCostReserve,
    refundCostReserve: result.refundCostReserve,
    otherVariableCosts: result.otherVariableCosts,
    taxContext: result.taxContext,
    customerNetPrice: result.customerNetPrice,
    customerVat: result.customerVat,
    customerGrossPrice: result.customerGrossPrice,
    buzzardContributionMargin: result.buzzardContributionMargin,
    calculatedAt: result.calculatedAt,
    capturedAt: new Date().toISOString(),
  };
}
