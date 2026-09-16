import { resolvePredefinedLiveProfile } from "@/lib/supplier-engine/liveSupplier/config";
import { FIRST_ORDER_LIMITS } from "@/lib/supplier-order-activation/config";
import type { ReadinessChannel } from "@/lib/supplier-order-readiness/types";

export const ARMING_VERSION = "343.1.0";
export const ARMING_TTL_MS = Number(process.env.SUPPLIER_PRODUCTION_ARMING_TTL_MS || 24 * 60 * 60 * 1000);
export const ARMING_APPROVAL_TTL_MS = Number(process.env.SUPPLIER_PRODUCTION_ARMING_APPROVAL_TTL_MS || 4 * 60 * 60 * 1000);

export function getInterCarsSupplierId(): string {
  return resolvePredefinedLiveProfile()?.supplierId || "SUP-INTER-CARS-001";
}

export function getInterCarsAdapterProfile(): string {
  return resolvePredefinedLiveProfile()?.adapterProfile || "inter-cars";
}

export function buildArmingIdempotencyKey(scope: {
  supplier: string;
  market: string;
  channel: ReadinessChannel;
  environment: string;
  requester: string;
}): string {
  return `arm343_${scope.supplier}_${scope.market}_${scope.channel}_${scope.environment}_${scope.requester}`;
}

export function resolveArmingLimits() {
  return {
    maximumQuantity: Math.min(
      Number(process.env.SUPPLIER_PRODUCTION_ARMING_MAX_QTY || 1),
      FIRST_ORDER_LIMITS.maxQuantity,
    ),
    maximumOrderValue: Math.min(
      Number(process.env.SUPPLIER_PRODUCTION_ARMING_MAX_VALUE || 500),
      FIRST_ORDER_LIMITS.maxOrderValue,
    ),
    allowedSupplier: getInterCarsSupplierId(),
    allowedMarket: process.env.SUPPLIER_PRODUCTION_ARMING_MARKET || "DE",
    allowedCurrency: process.env.SUPPLIER_PRODUCTION_ARMING_CURRENCY || "EUR",
    allowedProductCategory: process.env.SUPPLIER_PRODUCTION_ARMING_PRODUCT_CATEGORY,
  };
}
