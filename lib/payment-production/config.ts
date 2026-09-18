import { isProductionFlagEnabled } from "@/lib/production-defaults";
import type { PaymentEnvironment, PaymentProviderConfig, PaymentProviderKind } from "./types";

export const PAYMENT_PRODUCTION_VERSION = "350.2.0";

const PROVIDER_FLAG_ENV: Record<PaymentProviderKind, string> = {
  PAYPAL: "PAYPAL_ENABLED",
  CARD: "CARD_ENABLED",
  SEPA: "SEPA_ENABLED",
  APPLE_PAY: "APPLE_PAY_ENABLED",
  GOOGLE_PAY: "GOOGLE_PAY_ENABLED",
  AMAZON_PAY: "AMAZON_PAY_ENABLED",
  KLARNA: "KLARNA_ENABLED",
  LOCAL_PAYMENT: "LOCAL_PAYMENT_ENABLED",
  MOCK: "MOCK_PAYMENT_ENABLED",
};

const PROVIDER_SECRET_REFS: Record<PaymentProviderKind, string[]> = {
  PAYPAL: ["PAYPAL_CLIENT_ID_SECRET_REF", "PAYPAL_CLIENT_SECRET_SECRET_REF", "PAYPAL_WEBHOOK_SECRET_REF"],
  CARD: ["PAYMENT_CARD_SECRET_REF", "PAYMENT_PROVIDER_SECRET_REF"],
  SEPA: ["PAYMENT_SEPA_SECRET_REF", "PAYMENT_PROVIDER_SECRET_REF"],
  APPLE_PAY: ["PAYMENT_APPLE_PAY_SECRET_REF"],
  GOOGLE_PAY: ["PAYMENT_GOOGLE_PAY_SECRET_REF"],
  AMAZON_PAY: [
    "AMAZON_PAY_CLIENT_ID_SECRET_REF",
    "AMAZON_PAY_CLIENT_SECRET_SECRET_REF",
    "AMAZON_PAY_PUBLIC_KEY_SECRET_REF",
    "AMAZON_PAY_PRIVATE_KEY_SECRET_REF",
  ],
  KLARNA: ["KLARNA_API_KEY_SECRET_REF", "KLARNA_API_SECRET_SECRET_REF"],
  LOCAL_PAYMENT: ["PAYMENT_LOCAL_SECRET_REF"],
  MOCK: [],
};

export function isPaymentProductionEnabled(): boolean {
  return isProductionFlagEnabled("PAYMENT_PRODUCTION");
}

export function isProviderFlagEnabled(kind: PaymentProviderKind): boolean {
  const envKey = PROVIDER_FLAG_ENV[kind];
  const value = process.env[envKey];
  return value === "1" || value === "true";
}

/** PayPal env alias per spec. */
export function isPayPalEnabled(): boolean {
  const legacy = process.env.PAYMENT_PAYPAL_ENABLED;
  if (legacy === "1" || legacy === "true") return true;
  return isProviderFlagEnabled("PAYPAL");
}

export function getDefaultPaymentProviderKind(): PaymentProviderKind {
  const configured = (process.env.PAYMENT_PROVIDER || "mock").toUpperCase();
  const valid: PaymentProviderKind[] = [
    "PAYPAL", "CARD", "SEPA", "APPLE_PAY", "GOOGLE_PAY", "AMAZON_PAY", "KLARNA", "LOCAL_PAYMENT", "MOCK",
  ];
  if (valid.includes(configured as PaymentProviderKind)) return configured as PaymentProviderKind;
  if (configured === "STRIPE" || configured === "ADYEN") return "CARD";
  return "MOCK";
}

/** @deprecated use getDefaultPaymentProviderKind */
export function getDefaultPaymentProviderId(): PaymentProviderKind {
  return getDefaultPaymentProviderKind();
}

export function resolvePaymentEnvironment(): PaymentEnvironment {
  if (process.env.NODE_ENV === "test" || process.env.CI === "true") return "MOCK";
  if (isPaymentProductionEnabled()) return "PRODUCTION";
  if (process.env.PAYMENT_SANDBOX === "1") return "SANDBOX";
  return "MOCK";
}

export function hasProviderSecretRef(kind: PaymentProviderKind): boolean {
  const refs = PROVIDER_SECRET_REFS[kind] ?? [];
  return refs.some((key) => Boolean(process.env[key]?.trim()));
}

export function resolvePaymentProviderConfig(kind: PaymentProviderKind): PaymentProviderConfig {
  const refs = PROVIDER_SECRET_REFS[kind] ?? [];
  const primaryRef = refs.find((key) => process.env[key]?.trim()) ?? `${kind.toLowerCase()}_secret_ref_unconfigured`;
  const webhookKey = kind === "PAYPAL"
    ? "PAYPAL_WEBHOOK_SECRET_REF"
    : `PAYMENT_${kind}_WEBHOOK_SECRET_REF`;

  return {
    providerId: kind,
    secretRef: primaryRef,
    environment: resolvePaymentEnvironment(),
    webhookSecretRef: process.env[webhookKey],
    enabled: kind === "MOCK" ? true : isProviderFlagEnabled(kind),
  };
}

export function listAllProviderKinds(): PaymentProviderKind[] {
  return [
    "PAYPAL", "CARD", "SEPA", "APPLE_PAY", "GOOGLE_PAY", "AMAZON_PAY", "KLARNA", "LOCAL_PAYMENT", "MOCK",
  ];
}
