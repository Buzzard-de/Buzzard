import { isProductionFlagEnabled } from "@/lib/production-defaults";
import type { AiProductionProviderId, AiWorkerId } from "./types";

export const AI_PRODUCTION_VERSION = "352.1.0";

export const AI_WORKERS: AiWorkerId[] = [
  "PRODUCT_AI",
  "SUPPLIER_AI",
  "PRICING_AI",
  "INVENTORY_AI",
  "ORDER_AI",
  "MARKETPLACE_AI",
  "CUSTOMS_AI",
  "CUSTOMER_SERVICE_AI",
  "RETURNS_AI",
  "FINANCE_AI",
];

export function isAiProductionEnabled(): boolean {
  return isProductionFlagEnabled("AI_PRODUCTION");
}

export function getDefaultAiProviderId(): AiProductionProviderId {
  const id = (process.env.AI_PROVIDER || "mock").toLowerCase();
  if (id === "openai" || id === "anthropic" || id === "google") return id;
  return "mock";
}

export function resolveAiSecretRef(providerId: AiProductionProviderId): string {
  return process.env[`AI_${providerId.toUpperCase()}_SECRET_REF`] || `${providerId}_secret_ref`;
}
