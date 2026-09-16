import { resolvePredefinedLiveProfile } from "@/lib/supplier-engine/liveSupplier/config";
import type { ReadinessChannel } from "@/lib/supplier-order-readiness/types";
import type { ValidationMode } from "./types";

export const VALIDATOR_VERSION = "341.1.0";
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
  if (raw === "SANDBOX" || raw === "VALIDATION" || raw === "PRODUCTION") return raw;
  return "MOCK";
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
