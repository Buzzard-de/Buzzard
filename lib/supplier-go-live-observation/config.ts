import { resolvePredefinedLiveProfile } from "@/lib/supplier-engine/liveSupplier/config";
import { resolveGoLiveLimits } from "@/lib/supplier-controlled-go-live/config";
import type { ReadinessChannel } from "@/lib/supplier-order-readiness/types";
import type { ObservationConfig, ObservationThresholds, RolloutLimits, RolloutScope } from "./types";

export const OBSERVATION_VERSION = "346.1.0";
export const OBSERVATION_TTL_MS = Number(process.env.SUPPLIER_OBSERVATION_TTL_MS || 14 * 24 * 60 * 60 * 1000);
export const ROLLOUT_APPROVAL_TTL_MS = Number(
  process.env.SUPPLIER_ROLLOUT_APPROVAL_TTL_MS || 24 * 60 * 60 * 1000,
);
export const ROLLOUT_ACTIVE_TTL_MS = Number(process.env.SUPPLIER_ROLLOUT_ACTIVE_TTL_MS || 30 * 24 * 60 * 60 * 1000);

export function getInterCarsSupplierId(): string {
  return resolvePredefinedLiveProfile()?.supplierId || "SUP-INTER-CARS-001";
}

export function resolveObservationConfig(): ObservationConfig {
  return {
    observationDurationMs: Number(process.env.SUPPLIER_OBSERVATION_DURATION_MS || 7 * 24 * 60 * 60 * 1000),
    minimumOrders: Number(process.env.SUPPLIER_OBSERVATION_MIN_ORDERS || 1),
    minimumObservationData: process.env.SUPPLIER_OBSERVATION_MIN_DATA !== "0",
  };
}

export function resolveObservationThresholds(): ObservationThresholds {
  const hasAny =
    process.env.SUPPLIER_OBSERVATION_MAX_SUPPLIER_ERROR_RATE ||
    process.env.SUPPLIER_OBSERVATION_MAX_UNKNOWN_OUTCOME_RATE ||
    process.env.SUPPLIER_OBSERVATION_MAX_INVENTORY_MISMATCH ||
    process.env.SUPPLIER_OBSERVATION_MAX_PRICE_MISMATCH ||
    process.env.SUPPLIER_OBSERVATION_MAX_FINANCIAL_MISMATCH ||
    process.env.SUPPLIER_OBSERVATION_MAX_CRITICAL_INCIDENTS;

  if (!hasAny && process.env.SUPPLIER_OBSERVATION_THRESHOLDS_CONFIGURED !== "1") {
    return { configured: false };
  }

  return {
    configured: true,
    maxSupplierErrorRate: Number(process.env.SUPPLIER_OBSERVATION_MAX_SUPPLIER_ERROR_RATE || 0.05),
    maxUnknownOutcomeRate: Number(process.env.SUPPLIER_OBSERVATION_MAX_UNKNOWN_OUTCOME_RATE || 0),
    maxInventoryMismatch: Number(process.env.SUPPLIER_OBSERVATION_MAX_INVENTORY_MISMATCH || 0),
    maxPriceMismatch: Number(process.env.SUPPLIER_OBSERVATION_MAX_PRICE_MISMATCH || 0),
    maxFinancialMismatch: Number(process.env.SUPPLIER_OBSERVATION_MAX_FINANCIAL_MISMATCH || 0),
    maxCriticalIncidents: Number(process.env.SUPPLIER_OBSERVATION_MAX_CRITICAL_INCIDENTS || 0),
  };
}

export function buildObservationIdempotencyKey(scope: {
  supplier: string;
  market: string;
  channel: ReadinessChannel;
  goLiveId: string;
}): string {
  return `obs346_${scope.supplier}_${scope.market}_${scope.channel}_${scope.goLiveId}`;
}

export function resolveDefaultRolloutScope(): RolloutScope {
  const goLiveLimits = resolveGoLiveLimits();
  return {
    supplier: getInterCarsSupplierId(),
    market: goLiveLimits.allowedMarket,
    channel: "DIRECT",
    environment: "PRODUCTION",
    currency: goLiveLimits.allowedCurrency,
    allowedCategories: goLiveLimits.allowedCategories,
    markets: [goLiveLimits.allowedMarket],
    allowedCurrencies: [goLiveLimits.allowedCurrency],
  };
}

export function resolveBroaderRolloutLimits(proposed?: Partial<RolloutLimits>): RolloutLimits {
  const controlled = resolveGoLiveLimits();
  const base: RolloutLimits = {
    maximumOrderValue: Math.min(
      Number(process.env.SUPPLIER_BROADER_ROLLOUT_MAX_ORDER_VALUE || controlled.maximumOrderValue),
      controlled.maximumOrderValue,
    ),
    maximumDailyOrders: Math.min(
      Number(process.env.SUPPLIER_BROADER_ROLLOUT_MAX_DAILY_ORDERS || controlled.maximumDailyOrders),
      controlled.maximumDailyOrders,
    ),
    maximumDailyValue: Math.min(
      Number(process.env.SUPPLIER_BROADER_ROLLOUT_MAX_DAILY_VALUE || controlled.maximumDailyValue),
      controlled.maximumDailyValue,
    ),
    allowedSupplier: controlled.allowedSupplier,
    allowedMarket: controlled.allowedMarket,
    allowedCurrency: controlled.allowedCurrency,
    allowedCategories: controlled.allowedCategories,
    allowedMarkets: [controlled.allowedMarket],
    allowedCurrencies: [controlled.allowedCurrency],
  };

  if (!proposed) return base;

  return {
    ...base,
    maximumOrderValue: Math.min(proposed.maximumOrderValue ?? base.maximumOrderValue, controlled.maximumOrderValue),
    maximumDailyOrders: Math.min(proposed.maximumDailyOrders ?? base.maximumDailyOrders, controlled.maximumDailyOrders),
    maximumDailyValue: Math.min(proposed.maximumDailyValue ?? base.maximumDailyValue, controlled.maximumDailyValue),
    allowedMarkets: proposed.allowedMarkets?.length ? proposed.allowedMarkets : base.allowedMarkets,
    allowedCurrencies: proposed.allowedCurrencies?.length ? proposed.allowedCurrencies : base.allowedCurrencies,
    allowedCategories: proposed.allowedCategories ?? base.allowedCategories,
  };
}
