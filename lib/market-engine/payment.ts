import engineExtensions from "@/data/global/market_engine_extensions.json";
import { getMarket } from "./registry";

const paymentCapabilitiesByRegion = (engineExtensions as {
  paymentCapabilities: Record<string, string[]>;
}).paymentCapabilities;

export type PaymentMethodCapability = "card" | "sepa" | "paypal" | "klarna" | string;

export function getMarketPaymentCapabilities(countryCode: string): PaymentMethodCapability[] {
  const market = getMarket(countryCode);
  if (!market) return ["card"];
  return market.paymentCapabilities as PaymentMethodCapability[];
}

export function getPaymentCapabilitiesForRegion(paymentRegion: string): PaymentMethodCapability[] {
  return paymentCapabilitiesByRegion[paymentRegion] ?? ["card"];
}

export function isPaymentCapabilityEnabled(
  countryCode: string,
  capability: PaymentMethodCapability
): boolean {
  const flags = getMarket(countryCode)?.featureFlags.paymentEnabled;
  if (flags === false) return false;
  return getMarketPaymentCapabilities(countryCode).includes(capability);
}
