import { roundMoney } from "@/lib/market-engine/money";
import { getReturnReserveConfig } from "./registry";
import type { ReturnReserveConfig } from "./types";

export interface ResolvedReturnReserves {
  returnCostReserve: number;
  refundCostReserve: number;
  totalReserve: number;
  config: ReturnReserveConfig;
  breakdown: {
    expectedReturnLoss: number;
    expectedRefundLoss: number;
    supplierCreditFactor: number;
  };
}

/**
 * Financial risk-management layer for returns/refunds.
 * NOT a legal assumption — models expected Buzzard loss when supplier credit is uncertain.
 *
 * Flow visibility:
 * Customer Refund → Supplier Credit/Refund → Return Shipping → Marketplace Refund → Buzzard Loss
 */
export function calculateReturnReserves(
  supplierCostInMarketCurrency: number,
  categoryId?: string
): ResolvedReturnReserves {
  const config = getReturnReserveConfig(categoryId);

  const supplierCreditFactor = 1 - config.supplierReturnAcceptanceRate;

  const expectedReturnLoss = roundMoney(
    config.returnRate *
      (config.averageReturnShippingCost + supplierCostInMarketCurrency * supplierCreditFactor)
  );

  const expectedRefundLoss = roundMoney(
    config.refundRate * (config.averageRefundLoss + supplierCostInMarketCurrency * supplierCreditFactor)
  );

  const damagedLoss = roundMoney(
    (config.damagedReturnRate ?? 0) * supplierCostInMarketCurrency * 0.5
  );

  const returnCostReserve = roundMoney(expectedReturnLoss + damagedLoss);
  const refundCostReserve = roundMoney(expectedRefundLoss);

  return {
    returnCostReserve,
    refundCostReserve,
    totalReserve: roundMoney(returnCostReserve + refundCostReserve),
    config,
    breakdown: {
      expectedReturnLoss,
      expectedRefundLoss,
      supplierCreditFactor,
    },
  };
}
