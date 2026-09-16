import { resolvePredefinedLiveProfile } from "@/lib/supplier-engine/liveSupplier/config";
import type { ReadinessChannel } from "@/lib/supplier-order-readiness/types";
import type { ValidationMode } from "./types";

export const VALIDATOR_VERSION = "342.1.0";
export const VALIDATION_TTL_MS = 24 * 60 * 60 * 1000;
export const CONTROLLED_VALIDATION_MAX_VALUE = Number(
  process.env.SUPPLIER_CREATE_ORDER_VALIDATION_MAX_VALUE || 100,
);
export const CONTROLLED_VALIDATION_MAX_QTY = Number(
  process.env.SUPPLIER_CREATE_ORDER_VALIDATION_MAX_QTY || 1,
);

export function getInterCarsSupplierId(): string {
  return resolvePredefinedLiveProfile()?.supplierId || "SUP-INTER-CARS-001";
}

export function getInterCarsAdapterProfile(): string {
  return resolvePredefinedLiveProfile()?.adapterProfile || "inter-cars";
}

export function getCreateOrderEndpointPath(): string {
  const profile = resolvePredefinedLiveProfile();
  const endpoints = profile?.endpoints as Record<string, string> | undefined;
  return endpoints?.createOrder || endpoints?.orders || "/ic/order/createOrder";
}

export function resolveValidationMode(): ValidationMode {
  const raw = (process.env.SUPPLIER_CREATE_ORDER_VALIDATION_MODE || "MOCK").toUpperCase();
  if (raw === "SANDBOX" || raw === "VALIDATION" || raw === "CONTROLLED_VALIDATION" || raw === "PRODUCTION") {
    return raw as ValidationMode;
  }
  return "MOCK";
}

export function getControlledValidationTestAddress(): Record<string, string> | undefined {
  const raw = process.env.SUPPLIER_CONTROLLED_VALIDATION_TEST_ADDRESS_JSON?.trim();
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return undefined;
  }
}

export function getControlledValidationAllowedProduct(): string | undefined {
  return process.env.SUPPLIER_CONTROLLED_VALIDATION_ALLOWED_PRODUCT?.trim() || undefined;
}

export function isControlledValidationEnabled(): boolean {
  return process.env.SUPPLIER_CREATE_ORDER_VALIDATION_ENABLED === "1";
}

export function buildValidationIdempotencyKey(scope: {
  supplierId: string;
  market: string;
  channel: ReadinessChannel;
  environment: string;
  orderId?: string;
}): string {
  const base = `co341_${scope.supplierId}_${scope.market}_${scope.channel}_${scope.environment}`;
  return scope.orderId ? `${base}_${scope.orderId}` : base;
}
