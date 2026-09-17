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
  return {
    providerId,
    secretRef: process.env[`PAYMENT_${providerId.toUpperCase()}_SECRET_REF`] || `${providerId}_secret_ref`,
    environment: isPaymentProductionEnabled() ? "PRODUCTION" : "SANDBOX",
    webhookSecretRef: process.env[`PAYMENT_${providerId.toUpperCase()}_WEBHOOK_SECRET_REF`],
  };
}
