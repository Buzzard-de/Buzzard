import { formatCurrencyIntl } from "@/lib/market-engine/money";
import type { PricingEngineAdminRow, PricingInput, PricingResult } from "./types";
import { calculatePrice } from "./price";

export function buildPricingAdminRow(result: PricingResult): PricingEngineAdminRow {
  return {
    productId: result.productId,
    supplierId: result.supplierId,
    marketId: result.marketId,
    channel: result.channel,
    supplierCost: formatCurrencyIntl(result.supplierNetPrice, result.supplierCurrency),
    shippingCost: formatCurrencyIntl(result.shippingCost, result.currency),
    marketplaceFee: formatCurrencyIntl(result.marketplaceFee, result.currency),
    paymentFee: formatCurrencyIntl(result.paymentFee, result.currency),
    returnReserve: formatCurrencyIntl(
      result.returnCostReserve + result.refundCostReserve,
      result.currency
    ),
    targetMargin: `${(result.targetMarginPercent * 100).toFixed(1)}%`,
    calculatedPrice: formatCurrencyIntl(result.customerGrossPrice, result.currency),
    actualMargin: `${(result.buzzardContributionMargin * 100).toFixed(1)}%`,
    pricingStatus: result.pricingStatus,
    lastCalculation: result.calculatedAt,
  };
}

export function getPricingAdminOverview(inputs: PricingInput[]): PricingEngineAdminRow[] {
  return inputs.map((input) => buildPricingAdminRow(calculatePrice(input)));
}
