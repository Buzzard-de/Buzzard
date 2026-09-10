import { createMarketplaceReturn } from "@/lib/marketplace-engine";
import {
  getReturnRequest,
  saveMarketplaceRefund,
  getMarketplaceRefundForReturn,
  saveReturnRequest,
} from "./registry";
import { emitReturnEvent } from "./events";
import type { MarketplaceRefund } from "./types";

export function importMarketplaceReturn(input: {
  marketplaceReturnId: string;
  marketplaceId: string;
  orderId: string;
  returnId: string;
  requestedAmount: number;
  reason?: string;
}): void {
  createMarketplaceReturn({
    marketplaceReturnId: input.marketplaceReturnId,
    orderId: input.orderId,
    marketplaceId: input.marketplaceId,
    reason: input.reason,
    requestedAmount: input.requestedAmount,
  });
}

export function recordMarketplaceRefund(input: {
  returnId: string;
  marketplaceId: string;
  marketplaceOrderId?: string;
  orderId: string;
  requestedAmount: number;
  approvedAmount: number;
  refundedAmount: number;
  fees: number;
  currency: string;
}): MarketplaceRefund {
  const existing = getMarketplaceRefundForReturn(input.returnId);
  if (existing) return existing;

  const now = new Date().toISOString();
  const refund: MarketplaceRefund = {
    marketplaceRefundId: `mrf_${input.returnId}_${Date.now()}`,
    marketplaceId: input.marketplaceId,
    marketplaceOrderId: input.marketplaceOrderId,
    orderId: input.orderId,
    returnId: input.returnId,
    requestedAmount: input.requestedAmount,
    approvedAmount: input.approvedAmount,
    refundedAmount: input.refundedAmount,
    fees: input.fees,
    currency: input.currency,
    status: input.refundedAmount >= input.approvedAmount ? "COMPLETED" : "PARTIAL",
    dryRun: true,
    createdAt: now,
    updatedAt: now,
  };
  saveMarketplaceRefund(refund);

  const ret = getReturnRequest(input.returnId);
  if (ret) {
    saveReturnRequest({
      ...ret,
      marketplaceRefundAmount: input.refundedAmount,
      updatedAt: now,
    });
  }

  emitReturnEvent({
    returnId: input.returnId,
    type: "MARKETPLACE_REFUND_COMPLETED",
    source: "returns-engine",
    metadata: { marketplaceRefundId: refund.marketplaceRefundId },
  });

  return refund;
}
