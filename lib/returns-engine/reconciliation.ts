import { getOrder } from "@/lib/order-engine";
import { calculateReturnReserves } from "@/lib/pricing-engine/returns";
import {
  getReturnRequest,
  saveReconciliation,
  getRecoveriesForReturn,
  getReconciliation,
  saveReturnRequest,
  getCustomerRefundForReturn,
  getMarketplaceRefundForReturn,
} from "./registry";
import { getReturnShippingFinancials } from "./shipment";
import type { FinancialReconciliation } from "./types";

/**
 * Pricing Engine return reserve = expected risk.
 * Returns Engine financial impact = actual outcome.
 */

export function reconcileReturnFinancials(
  returnId: string,
  options?: { finalize?: boolean }
): FinancialReconciliation | undefined {
  const ret = getReturnRequest(returnId);
  if (!ret) return undefined;

  const order = getOrder(ret.orderId);
  const customerRefundRecord = getCustomerRefundForReturn(returnId);
  const marketplaceRefundRecord = getMarketplaceRefundForReturn(returnId);
  const recoveries = getRecoveriesForReturn(returnId);
  const shipping = getReturnShippingFinancials(returnId);

  const customerRefund = customerRefundRecord?.refundedAmount ?? ret.customerRefundAmount;
  const supplierRefund = recoveries
    .filter((r) => r.type === "SUPPLIER_REFUND")
    .reduce((s, r) => s + r.receivedAmount, 0);
  const supplierCredit = recoveries
    .filter((r) => r.type === "SUPPLIER_CREDIT" || r.type === "PARTIAL_CREDIT")
    .reduce((s, r) => s + r.receivedAmount, 0);
  const shippingRecovery = shipping.supplierReturnShippingRecovery + shipping.marketplaceReturnShippingRecovery;
  const returnShippingCost = shipping.buzzardReturnShippingCost;
  const marketplaceRefundCost =
    (marketplaceRefundRecord?.fees ?? 0) +
    Math.max(0, (marketplaceRefundRecord?.requestedAmount ?? 0) - (marketplaceRefundRecord?.refundedAmount ?? 0));

  const supplierRecoveryTotal = supplierRefund + supplierCredit + shippingRecovery;
  const totalCosts = customerRefund + returnShippingCost + marketplaceRefundCost;
  const totalRecoveries = supplierRecoveryTotal;
  const buzzardFinalReturnImpact = totalCosts - totalRecoveries;

  const supplierCost = order?.items[0]?.supplierCostSnapshot ?? 0;
  const estimated = calculateReturnReserves(supplierCost, order?.items[0]?.productId);
  const originalOrderMargin = order?.items.reduce((s, i) => s + i.marginSnapshot, 0) ?? 0;

  const estimatedReturnCost = estimated.totalReserve;
  const actualReturnCost = totalCosts;
  const estimatedSupplierRecovery = supplierCost * estimated.config.supplierReturnAcceptanceRate;
  const actualSupplierRecovery = supplierRecoveryTotal;
  const estimatedBuzzardImpact = estimatedReturnCost;
  const actualBuzzardImpact = buzzardFinalReturnImpact;

  const rec: FinancialReconciliation = {
    reconciliationId: `rec_fin_${returnId}`,
    returnId,
    orderId: ret.orderId,
    currency: ret.currency,
    customerRefund,
    returnShippingCost,
    marketplaceRefundCost,
    otherCosts: 0,
    supplierRefund,
    supplierCredit,
    shippingRecovery,
    otherRecoveries: 0,
    buzzardFinalReturnImpact,
    estimatedReturnCost,
    actualReturnCost,
    estimatedSupplierRecovery,
    actualSupplierRecovery,
    estimatedBuzzardImpact,
    actualBuzzardImpact,
    originalOrderMargin,
    returnImpact: actualBuzzardImpact,
    finalOrderContribution: originalOrderMargin - actualBuzzardImpact,
    isFinal: options?.finalize ?? false,
    calculatedAt: new Date().toISOString(),
  };

  saveReconciliation(rec);

  saveReturnRequest({
    ...ret,
    buzzardLoss: buzzardFinalReturnImpact,
    buzzardRecovery: supplierRecoveryTotal,
    updatedAt: rec.calculatedAt,
  });

  return rec;
}

export { getReconciliation };
