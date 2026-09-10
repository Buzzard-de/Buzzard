import { getReturnRecord, saveReturnRecord } from "./registry";
import type { MarketplaceReturnRecord } from "./types";

/**
 * Future financial chain (NOT implemented — foundation only):
 *
 * Customer / Marketplace Refund
 *   ↓
 * Buzzard Refund
 *   ↓
 * Supplier Credit / Supplier Refund
 *   ↓
 * Return Shipping
 *   ↓
 * Final Buzzard Loss / Profit
 *
 * Do NOT assume supplier automatically refunds Buzzard.
 */

export function documentMarketplaceRefundChain(): string {
  return [
    "Customer / Marketplace Refund",
    "→ Buzzard Refund",
    "→ Supplier Credit / Supplier Refund",
    "→ Return Shipping",
    "→ Final Buzzard Loss / Profit",
  ].join("\n");
}

export function createMarketplaceReturn(input: {
  marketplaceReturnId: string;
  orderId: string;
  marketplaceId: string;
  reason?: string;
  requestedAmount?: number;
}): MarketplaceReturnRecord {
  const record: MarketplaceReturnRecord = {
    marketplaceReturnId: input.marketplaceReturnId,
    orderId: input.orderId,
    marketplaceId: input.marketplaceId,
    status: "REQUESTED",
    reason: input.reason,
    requestedAmount: input.requestedAmount,
    requestedAt: new Date().toISOString(),
  };
  saveReturnRecord(record);
  return record;
}

export function initMarketplaceRefund(input: {
  marketplaceReturnId: string;
  approvedAmount?: number;
}): MarketplaceReturnRecord | undefined {
  const record = getReturnRecord(input.marketplaceReturnId);
  if (!record) return undefined;

  const updated: MarketplaceReturnRecord = {
    ...record,
    status: "APPROVED",
    approvedAmount: input.approvedAmount ?? record.requestedAmount,
    resolvedAt: new Date().toISOString(),
  };
  saveReturnRecord(updated);
  return updated;
}
