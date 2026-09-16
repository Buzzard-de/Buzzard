import { resolvePredefinedLiveProfile } from "@/lib/supplier-engine/liveSupplier/config";
import { FIRST_ORDER_LIMITS } from "@/lib/supplier-order-activation/config";
import { resolveArmingLimits } from "@/lib/supplier-production-order-arming/config";
import type { ReadinessChannel } from "@/lib/supplier-order-readiness/types";

export const FIRST_PRODUCTION_ORDER_VERSION = "344.1.0";
export const FIRST_ORDER_TTL_MS = Number(process.env.SUPPLIER_FIRST_PRODUCTION_ORDER_TTL_MS || 24 * 60 * 60 * 1000);
export const FIRST_ORDER_APPROVAL_TTL_MS = Number(
  process.env.SUPPLIER_FIRST_PRODUCTION_ORDER_APPROVAL_TTL_MS || 4 * 60 * 60 * 1000,
);
export const EXECUTION_AUTH_TTL_MS = Number(
  process.env.SUPPLIER_FIRST_PRODUCTION_ORDER_AUTH_TTL_MS || 30 * 60 * 1000,
);

export function getInterCarsSupplierId(): string {
  return resolvePredefinedLiveProfile()?.supplierId || "SUP-INTER-CARS-001";
}

export function getInterCarsAdapterProfile(): string {
  return resolvePredefinedLiveProfile()?.adapterProfile || "inter-cars";
}

export function buildFirstOrderIdempotencyKey(scope: {
  supplier: string;
  market: string;
  channel: ReadinessChannel;
  orderId: string;
  requester: string;
}): string {
  return `fpo344_${scope.supplier}_${scope.market}_${scope.channel}_${scope.orderId}_${scope.requester}`;
}

export function resolveFirstProductionOrderLimits() {
  const armingLimits = resolveArmingLimits();
  return {
    maximumQuantity: Math.min(
      Number(process.env.SUPPLIER_FIRST_PRODUCTION_ORDER_MAX_QTY || 1),
      armingLimits.maximumQuantity,
      FIRST_ORDER_LIMITS.maxQuantity,
    ),
    maximumOrderValue: Math.min(
      Number(process.env.SUPPLIER_FIRST_PRODUCTION_ORDER_MAX_VALUE || 500),
      armingLimits.maximumOrderValue,
      FIRST_ORDER_LIMITS.maxOrderValue,
    ),
    allowedSupplier: getInterCarsSupplierId(),
    allowedMarket: process.env.SUPPLIER_FIRST_PRODUCTION_ORDER_MARKET || "DE",
    allowedCurrency: process.env.SUPPLIER_FIRST_PRODUCTION_ORDER_CURRENCY || "EUR",
    allowedProductCategory: process.env.SUPPLIER_FIRST_PRODUCTION_ORDER_PRODUCT_CATEGORY,
    allowedSku: process.env.SUPPLIER_FIRST_PRODUCTION_ORDER_SKU,
  };
}
