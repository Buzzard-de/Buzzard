import { isProductionFlagEnabled } from "@/lib/production-defaults";
import type { PaymentProviderConfig, PaymentProviderId } from "./types";

export const PAYMENT_PRODUCTION_VERSION = "350.1.0";

export function isPaymentProductionEnabled(): boolean {
  return isProductionFlagEnabled("PAYMENT_PRODUCTION");
}

export function getDefaultPaymentProviderId(): PaymentProviderId {
  const configured = (process.env.PAYMENT_PROVIDER || "mock").toLowerCase();
  if (configured === "stripe" || configured === "adyen" || configured === "paypal") return configured;
  return "mock";
}

export function resolvePaymentProviderConfig(providerId: PaymentProviderId): PaymentProviderConfig {
  const providerRef = process.env[`PAYMENT_${providerId.toUpperCase()}_SECRET_REF`];
  const genericRef = process.env.PAYMENT_PROVIDER_SECRET_REF || process.env.PAYMENT_PROVIDER_SECRET;
  return {
    providerId,
    secretRef: providerRef || genericRef || `${providerId}_secret_ref_unconfigured`,
    environment: isPaymentProductionEnabled() ? "PRODUCTION" : "SANDBOX",
    webhookSecretRef: process.env[`PAYMENT_${providerId.toUpperCase()}_WEBHOOK_SECRET_REF`],
  };
}
