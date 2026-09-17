import type { ReadinessChannel } from "./types";

export const EVALUATOR_VERSION = "337.1.0";

export const READINESS_CHANNELS: ReadinessChannel[] = [
  "DIRECT",
  "AMAZON",
  "EBAY",
  "KAUFLAND",
  "ALLEGRO",
  "BOL",
  "CDISCOUNT",
  "OTTO",
];

export const READINESS_TTL_MS = 24 * 60 * 60 * 1000;
export const APPROVAL_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface ReadinessPolicyConfig {
  maxStockAgeMs: number;
  maxPriceAgeMs: number;
  maxProductAgeMs: number;
  maxOrderValue: number;
  maxDailyOrderValue: number;
  maxSingleSupplierOrderValue: number;
  blockOnWarningIncidents: boolean;
  blockOnMissingReturnCapability: boolean;
  blockOnMissingTrackingCapability: boolean;
  requiredOrderCapabilities: string[];
}

const DEFAULT_POLICY: ReadinessPolicyConfig = {
  maxStockAgeMs: Number(process.env.SUPPLIER_READINESS_MAX_STOCK_AGE_MS || 6 * 60 * 60 * 1000),
  maxPriceAgeMs: Number(process.env.SUPPLIER_READINESS_MAX_PRICE_AGE_MS || 6 * 60 * 60 * 1000),
  maxProductAgeMs: Number(process.env.SUPPLIER_READINESS_MAX_PRODUCT_AGE_MS || 24 * 60 * 60 * 1000),
  maxOrderValue: Number(process.env.SUPPLIER_READINESS_MAX_ORDER_VALUE || 5000),
  maxDailyOrderValue: Number(process.env.SUPPLIER_READINESS_MAX_DAILY_ORDER_VALUE || 25000),
  maxSingleSupplierOrderValue: Number(process.env.SUPPLIER_READINESS_MAX_SINGLE_ORDER_VALUE || 2500),
  blockOnWarningIncidents: process.env.SUPPLIER_READINESS_BLOCK_ON_WARNING_INCIDENTS === "1",
  blockOnMissingReturnCapability: process.env.SUPPLIER_READINESS_BLOCK_MISSING_RETURN !== "0",
  blockOnMissingTrackingCapability: false,
  requiredOrderCapabilities: ["createOrder", "orderStatus", "trackingAPI"],
};

let policyOverride: Partial<ReadinessPolicyConfig> | null = null;

export function getReadinessPolicy(): ReadinessPolicyConfig {
  return { ...DEFAULT_POLICY, ...(policyOverride || {}) };
}

export function setReadinessPolicyForTests(override: Partial<ReadinessPolicyConfig> | null): void {
  policyOverride = override;
}

export function isMockCredentialValue(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return (
    !normalized ||
    normalized === "mock" ||
    normalized === "test" ||
    normalized === "fake" ||
    normalized === "dummy-token" ||
    normalized.startsWith("mock-") ||
    normalized.startsWith("test-") ||
    normalized.startsWith("dummy-") ||
    normalized.includes("placeholder")
  );
}
