import { resolveActivationConfig } from "./config";
import type { SupplierOrderActivationRequest } from "./types";

export function evaluateOrderLimits(input: {
  activation: SupplierOrderActivationRequest;
  orderValue: number;
  dailyOrderValue?: number;
  dailyOrderCount?: number;
  marketDailyValue?: number;
  channelDailyValue?: number;
  isFirstOrder?: boolean;
  itemCount?: number;
  totalQuantity?: number;
}): { allowed: boolean; blockers: string[] } {
  const cfg = resolveActivationConfig();
  const blockers: string[] = [];
  const a = input.activation;
  const maxOrderValue = a.maxOrderValue ?? cfg.defaultMaxOrderValue;
  const maxDailyOrderValue = a.maxDailyOrderValue ?? cfg.defaultMaxDailyOrderValue;
  const maxOrders = a.maxOrders ?? cfg.defaultMaxOrders;

  if (input.orderValue > maxOrderValue) {
    blockers.push("MAX_ORDER_VALUE_EXCEEDED");
  }
  if ((input.dailyOrderValue ?? 0) + input.orderValue > maxDailyOrderValue) {
    blockers.push("MAX_DAILY_ORDER_VALUE_EXCEEDED");
  }
  if ((input.dailyOrderCount ?? 0) >= maxOrders) {
    blockers.push("MAX_DAILY_ORDER_COUNT_EXCEEDED");
  }
  if ((input.marketDailyValue ?? 0) + input.orderValue > cfg.defaultMaxMarketValue) {
    blockers.push("MAX_MARKET_VALUE_EXCEEDED");
  }
  if ((input.channelDailyValue ?? 0) + input.orderValue > cfg.defaultMaxChannelValue) {
    blockers.push("MAX_CHANNEL_VALUE_EXCEEDED");
  }

  if (input.isFirstOrder) {
    if (input.orderValue > cfg.firstOrderMaxValue) {
      blockers.push("FIRST_ORDER_VALUE_EXCEEDED");
    }
    if ((input.itemCount ?? 0) > cfg.firstOrderMaxItems) {
      blockers.push("FIRST_ORDER_ITEMS_EXCEEDED");
    }
    if ((input.totalQuantity ?? 0) > cfg.firstOrderMaxQuantity) {
      blockers.push("FIRST_ORDER_QUANTITY_EXCEEDED");
    }
  }

  return { allowed: blockers.length === 0, blockers };
}
