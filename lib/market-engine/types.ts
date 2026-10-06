import type { GlobalCountryEntry } from "@/lib/i18n/international/types";

/** Lifecycle status for a Buzzard market — not a simple boolean. */
export type MarketStatus = "PLANNED" | "TESTING" | "ACTIVE" | "PAUSED" | "DISABLED";

/** Feature flag value — boolean or staged rollout state. */
export type FeatureFlagValue = boolean | "testing" | "planned";

export interface MarketFeatureFlags {
  marketEnabled: FeatureFlagValue;
  categoryEnabled: FeatureFlagValue;
  marketplaceEnabled: FeatureFlagValue;
  supplierEnabled: FeatureFlagValue;
  paymentEnabled: FeatureFlagValue;
  shippingEnabled: FeatureFlagValue;
}

/** Marketplace integration lifecycle — not claiming live integration. */
export type MarketplaceIntegrationStatus =
  | "supported"
  | "configured"
  | "connected"
  | "active";

export interface MarketplaceCapability {
  id: string;
  name: string;
  status: MarketplaceIntegrationStatus;
}

export type CustomerType = "B2C" | "B2B";

export interface VatRules {
  /** Standard domestic rate (decimal, e.g. 0.19). */
  standardRate: number;
  /** Prices shown VAT-inclusive for this market (B2C default). */
  pricesIncludeVat: boolean;
  /** Tax model label from overlay (e.g. VAT). */
  taxModel: string;
}

export interface VatContextInput {
  sellerCountry: string;
  buyerCountry: string;
  customerType: CustomerType;
  /** Optional VAT ID for B2B — validated server-side in future (VIES). */
  vatId?: string;
}

export interface VatContext {
  rate: number;
  included: boolean;
  reverseCharge: boolean;
  reason: string;
}

export interface MarketConfig {
  countryCode: string;
  countryName: string;
  nativeCountryName: string;
  defaultLanguage: string;
  supportedLanguages: string[];
  locales: string[];
  currency: string;
  currencySymbol: string;
  timezone: string;
  textDirection: "ltr" | "rtl";
  vat: VatRules;
  shippingRegion: string;
  paymentRegion: string;
  legalRegion: string;
  returnRegion: string;
  supplierRegion: string;
  status: MarketStatus;
  featureFlags: MarketFeatureFlags;
  marketplaces: MarketplaceCapability[];
  paymentCapabilities: string[];
  shippingCapabilities: string[];
  /** Source country entry from global_countries_35.json */
  source: GlobalCountryEntry;
}

export interface DisplayPriceInput {
  /** Net or gross unit price in major currency units (depends on priceIncludesVat). */
  amount: number;
  currency: string;
  locale?: string;
  /** When true, amount is gross (VAT included). When false, amount is net. */
  priceIncludesVat?: boolean;
  vatRate?: number;
  quantity?: number;
  discountAmount?: number;
  shippingAmount?: number;
}

export interface DisplayPriceResult {
  netPrice: number;
  vatAmount: number;
  grossPrice: number;
  currency: string;
  formatted: string;
  formattedNet: string;
  formattedVat: string;
}

export interface ProductAvailabilityInput {
  id?: string;
  countryAvailability?: Record<string, boolean>;
  countryRestrictions?: Record<string, unknown>;
  categoryIds?: string[];
  supplierRegion?: string;
  stockStatus?: string;
  productType?: string;
}

export interface ProductAvailabilityResult {
  available: boolean;
  status: "AVAILABLE" | "BLOCKED" | "REVIEW_REQUIRED" | "MARKET_DISABLED";
  reason: string | null;
}

export interface BuzzardMarketContextValue {
  market: MarketConfig;
  country: string;
  language: string;
  currency: string;
  vat: VatRules;
  shippingRegion: string;
  paymentRegion: string;
  legalRegion: string;
  returnRegion: string;
  supplierRegion: string;
  status: MarketStatus;
  featureFlags: MarketFeatureFlags;
}

export interface MarketEngineAdminRow {
  country: string;
  countryName: string;
  languages: string;
  currency: string;
  vatRate: string;
  shippingRegion: string;
  paymentCapabilities: string;
  marketplaces: string;
  status: MarketStatus;
}
