import extensions from "@/data/global/pricing_engine_extensions.json";
import type {
  FeeSchedule,
  MarginRule,
  PaymentMethod,
  PriceBounds,
  PricingChannel,
  ReturnReserveConfig,
  RoundingRule,
} from "./types";

type Extensions = typeof extensions;

const config = extensions as Extensions;

export function getDefaultSellerCountry(): string {
  return config.defaultSellerCountry;
}

export function getExchangeRate(fromCurrency: string, toCurrency: string): number | null {
  const from = String(fromCurrency).toUpperCase();
  const to = String(toCurrency).toUpperCase();
  if (from === to) return 1;
  const rates = config.exchangeRates as Record<string, number>;
  const fromRate = rates[from];
  const toRate = rates[to];
  if (fromRate == null || toRate == null) return null;
  return fromRate / toRate;
}

export function getMarketplaceFeeSchedule(marketplaceId: PricingChannel): FeeSchedule {
  const fees = config.marketplaceFees as Record<string, FeeSchedule>;
  return fees[marketplaceId] ?? fees.direct;
}

export function getPaymentFeeSchedule(method: PaymentMethod = "default"): FeeSchedule {
  const fees = config.paymentFees as Record<string, FeeSchedule>;
  return fees[method] ?? fees.default;
}

export function getReturnReserveConfig(categoryId?: string): ReturnReserveConfig {
  const reserves = config.returnReserves;
  const byCategory = reserves.byCategory as Record<string, Partial<ReturnReserveConfig>>;
  const base = reserves.default as ReturnReserveConfig;
  const categoryOverride = categoryId ? byCategory[categoryId] : undefined;
  return { ...base, ...categoryOverride };
}

export function getMarginRule(options?: {
  marketId?: string;
  categoryId?: string;
  channel?: PricingChannel;
  marketplaceId?: PricingChannel;
  supplierId?: string;
}): MarginRule {
  const rules = config.marginRules;
  const defaults = rules.default as MarginRule;
  const byMarket = rules.byMarket as Record<string, Partial<MarginRule>>;
  const byCategory = rules.byCategory as Record<string, Partial<MarginRule>>;
  const byChannel = rules.byChannel as Record<string, Partial<MarginRule>>;
  const byMarketplace = rules.byMarketplace as Record<string, Partial<MarginRule>>;
  const bySupplier = rules.bySupplier as Record<string, Partial<MarginRule>>;

  const targetMarginPercent =
    (options?.supplierId ? bySupplier[options.supplierId]?.targetMarginPercent : undefined) ??
    (options?.marketplaceId ? byMarketplace[options.marketplaceId]?.targetMarginPercent : undefined) ??
    (options?.channel ? byChannel[options.channel]?.targetMarginPercent : undefined) ??
    (options?.categoryId ? byCategory[options.categoryId]?.targetMarginPercent : undefined) ??
    (options?.marketId ? byMarket[options.marketId]?.targetMarginPercent : undefined) ??
    defaults.targetMarginPercent ??
    config.defaultTargetMarginPercent;

  const minimumMarginPercent =
    (options?.supplierId ? bySupplier[options.supplierId]?.minimumMarginPercent : undefined) ??
    (options?.marketplaceId ? byMarketplace[options.marketplaceId]?.minimumMarginPercent : undefined) ??
    (options?.channel ? byChannel[options.channel]?.minimumMarginPercent : undefined) ??
    (options?.categoryId ? byCategory[options.categoryId]?.minimumMarginPercent : undefined) ??
    (options?.marketId ? byMarket[options.marketId]?.minimumMarginPercent : undefined) ??
    defaults.minimumMarginPercent ??
    config.defaultMinimumMarginPercent;

  return { targetMarginPercent, minimumMarginPercent };
}

export function getRoundingRule(marketId?: string, channel?: PricingChannel): RoundingRule {
  const rules = config.roundingRules;
  const defaults = rules.default as RoundingRule;
  const byMarket = rules.byMarket as Record<string, RoundingRule>;
  const byChannel = rules.byChannel as Record<string, RoundingRule>;
  if (channel && byChannel[channel]) return { ...defaults, ...byChannel[channel] };
  if (marketId && byMarket[marketId]) return { ...defaults, ...byMarket[marketId] };
  return defaults;
}

export function getPriceBounds(): PriceBounds {
  return config.priceBounds.default as PriceBounds;
}

export function getFixtureShippingCost(productId: string): number | undefined {
  const byProduct = config.shippingCosts.byProductFixture as Record<string, number>;
  return byProduct[productId];
}

export function getShippingCostByRegion(region: string): number | undefined {
  const byRegion = config.shippingCosts.byShippingRegion as Record<string, number>;
  return byRegion[region];
}

export function getDefaultShippingCost(): number {
  return config.shippingCosts.defaultSupplierDirect;
}

export function getDefaultShippingCurrency(): string {
  return config.shippingCosts.currency;
}

export function isCompetitivePricingEnabled(): boolean {
  return config.competitivePricingExtension.enabled === true;
}
