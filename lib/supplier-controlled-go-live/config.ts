import { resolvePredefinedLiveProfile } from "@/lib/supplier-engine/liveSupplier/config";
import { FIRST_ORDER_LIMITS } from "@/lib/supplier-order-activation/config";
import { resolveFirstProductionOrderLimits } from "@/lib/supplier-first-production-order/config";
import type { ReadinessChannel } from "@/lib/supplier-order-readiness/types";

export const GO_LIVE_VERSION = "345.1.0";
export const GO_LIVE_TTL_MS = Number(process.env.SUPPLIER_CONTROLLED_GO_LIVE_TTL_MS || 7 * 24 * 60 * 60 * 1000);
export const GO_LIVE_APPROVAL_TTL_MS = Number(
  process.env.SUPPLIER_CONTROLLED_GO_LIVE_APPROVAL_TTL_MS || 24 * 60 * 60 * 1000,
);
export const GO_LIVE_ROLLOUT_TTL_MS = Number(
  process.env.SUPPLIER_CONTROLLED_GO_LIVE_ROLLOUT_TTL_MS || 30 * 24 * 60 * 60 * 1000,
);

export function getInterCarsSupplierId(): string {
  return resolvePredefinedLiveProfile()?.supplierId || "SUP-INTER-CARS-001";
}

export function buildGoLiveIdempotencyKey(scope: {
  supplier: string;
  market: string;
  channel: ReadinessChannel;
  requester: string;
}): string {
  return `cgl345_${scope.supplier}_${scope.market}_${scope.channel}_${scope.requester}`;
}

export function resolveGoLiveLimits() {
  const firstOrderLimits = resolveFirstProductionOrderLimits();
  return {
    maximumOrderValue: Math.min(
      Number(process.env.SUPPLIER_CONTROLLED_GO_LIVE_MAX_ORDER_VALUE || 500),
      firstOrderLimits.maximumOrderValue,
      FIRST_ORDER_LIMITS.maxOrderValue,
    ),
    maximumDailyOrders: Number(process.env.SUPPLIER_CONTROLLED_GO_LIVE_MAX_DAILY_ORDERS || 5),
    maximumDailyValue: Number(process.env.SUPPLIER_CONTROLLED_GO_LIVE_MAX_DAILY_VALUE || 2500),
    allowedSupplier: getInterCarsSupplierId(),
    allowedMarket: process.env.SUPPLIER_CONTROLLED_GO_LIVE_MARKET || "DE",
    allowedCurrency: process.env.SUPPLIER_CONTROLLED_GO_LIVE_CURRENCY || "EUR",
    allowedCategories: process.env.SUPPLIER_CONTROLLED_GO_LIVE_CATEGORIES?.split(",").filter(Boolean),
  };
}
