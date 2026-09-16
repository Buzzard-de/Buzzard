import type { ReadinessChannel } from "@/lib/supplier-order-readiness/types";
import { resolvePredefinedLiveProfile } from "@/lib/supplier-engine/liveSupplier/config";
import type { ValidationEnvironment } from "./types";

export const VALIDATOR_VERSION = "339.1.0";

export const VALIDATION_CHANNELS: ReadinessChannel[] = [
  "DIRECT",
  "AMAZON",
  "EBAY",
  "KAUFLAND",
  "ALLEGRO",
  "BOL",
  "CDISCOUNT",
  "OTTO",
];

export function getInterCarsSupplierId(): string {
  return resolvePredefinedLiveProfile()?.supplierId || "SUP-INTER-CARS-001";
}

export function getInterCarsAdapterProfile(): string {
  return resolvePredefinedLiveProfile()?.adapterProfile || "inter-cars";
}

export function isProductionEnvironment(env: ValidationEnvironment): boolean {
  return env === "PRODUCTION";
}

export function buildValidationIdempotencyKey(scope: {
  supplierId: string;
  market: string;
  channel: string;
  environment: string;
  credentialRefFingerprint: string;
}): string {
  return `prodval_${scope.supplierId}_${scope.market}_${scope.channel}_${scope.environment}_${scope.credentialRefFingerprint}`;
}

export function credentialRefFingerprint(secretsRef?: string): string {
  if (!secretsRef) return "none";
  const normalized = secretsRef.trim().toLowerCase();
  if (normalized.startsWith("env:")) return normalized.slice(4);
  return normalized.replace(/[^a-z0-9_-]/gi, "_").slice(0, 48);
}
