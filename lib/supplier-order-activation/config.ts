import { resolvePredefinedLiveProfile } from "@/lib/supplier-engine/liveSupplier/config";
import type { ReadinessChannel } from "@/lib/supplier-order-readiness/types";

export const ACTIVATION_VERSION = "340.1.0";
export const ACTIVATION_TTL_MS = 24 * 60 * 60 * 1000;
export const APPROVAL_TTL_MS = 4 * 60 * 60 * 1000;
export const REHEARSAL_TTL_MS = Number(process.env.SUPPLIER_ACTIVATION_REHEARSAL_TTL_MS || 7 * 24 * 60 * 60 * 1000);
export const FIRST_ORDER_TTL_MS = 2 * 60 * 60 * 1000;

export const FIRST_ORDER_LIMITS = {
  maxOrderValue: Number(process.env.SUPPLIER_FIRST_ORDER_MAX_VALUE || 500),
  maxQuantity: Number(process.env.SUPPLIER_FIRST_ORDER_MAX_QTY || 5),
  maxItems: Number(process.env.SUPPLIER_FIRST_ORDER_MAX_ITEMS || 3),
  maxSuppliers: 1,
  maxCustomers: 1,
};

export function getInterCarsSupplierId(): string {
  return resolvePredefinedLiveProfile()?.supplierId || "SUP-INTER-CARS-001";
}

export function getInterCarsAdapterProfile(): string {
  return resolvePredefinedLiveProfile()?.adapterProfile || "inter-cars";
}

export function buildActivationIdempotencyKey(scope: {
  supplierId: string;
  market: string;
  channel: ReadinessChannel;
  environment: string;
  requester: string;
}): string {
  return `act_${scope.supplierId}_${scope.market}_${scope.channel}_${scope.environment}_${scope.requester}`;
}

export function getNetworkEnvState(): "DISABLED" | "ENABLED" {
  return process.env.SUPPLIER_ORDER_NETWORK_ENABLED === "1" ? "ENABLED" : "DISABLED";
}

export function resolveActivationConfig() {
  return {
    interCarsSupplierId: getInterCarsSupplierId(),
    interCarsAdapterProfile: getInterCarsAdapterProfile(),
    activationTtlMs: ACTIVATION_TTL_MS,
    approvalTtlMs: APPROVAL_TTL_MS,
    rehearsalTtlMs: REHEARSAL_TTL_MS,
    firstOrderTtlMs: FIRST_ORDER_TTL_MS,
    firstOrderMaxValue: FIRST_ORDER_LIMITS.maxOrderValue,
    firstOrderMaxQuantity: FIRST_ORDER_LIMITS.maxQuantity,
    firstOrderMaxItems: FIRST_ORDER_LIMITS.maxItems,
    defaultMaxMarketValue: Number(process.env.SUPPLIER_ACTIVATION_MAX_MARKET_VALUE || 10000),
    defaultMaxChannelValue: Number(process.env.SUPPLIER_ACTIVATION_MAX_CHANNEL_VALUE || 5000),
    defaultMaxOrderValue: Number(process.env.SUPPLIER_ACTIVATION_MAX_ORDER_VALUE || 1000),
    defaultMaxDailyOrderValue: Number(process.env.SUPPLIER_ACTIVATION_MAX_DAILY_VALUE || 5000),
    defaultMaxOrders: Number(process.env.SUPPLIER_ACTIVATION_MAX_ORDERS || 10),
  };
}
