import { getRegistryProduct } from "@/lib/product-engine/registry";
import { getTranslationForLocale } from "@/lib/product-engine/translations";
import { listMarkets } from "@/lib/market-engine/registry";
import { getOrder } from "@/lib/order-engine";
import type { OrderChannel } from "@/lib/order-engine/types";
import type { AnalyticsEvent, DeviceType, TrafficSourceType } from "../types";
import { toCents } from "../revenue";
import type {
  CategoryKpiRow,
  CommerceChannelKpiRow,
  DeviceKpiRow,
  LanguageKpiRow,
  MarketKpiRow,
  ProductKpiRow,
  TrafficSourceKpiRow,
} from "./types";
import {
  isAuthoritativePurchase,
  isAuthoritativeRefund,
  safeRate,
  uniqueOrderPurchases,
} from "./query";
import { computeContributionForOrder } from "./profitability";

const COMMERCE_CHANNELS: OrderChannel[] = [
  "direct",
  "amazon",
  "ebay",
  "kaufland",
  "allegro",
  "bol",
  "cdiscount",
  "otto",
];

const TRAFFIC_SOURCES: TrafficSourceType[] = [
  "DIRECT",
  "ORGANIC_SEARCH",
  "PAID_SEARCH",
  "SOCIAL",
  "EMAIL",
  "REFERRAL",
  "MARKETPLACE",
  "OTHER",
];

const DEVICES: DeviceType[] = ["DESKTOP", "MOBILE", "TABLET", "OTHER"];

const CORE_LANGUAGES = ["de", "en", "tr", "ar"];

function productName(productId: string): string {
  const product = getRegistryProduct(productId);
  if (!product) return productId;
  const tr = getTranslationForLocale(product.translations, "de");
  return tr?.name ?? productId;
}

function productCategoryId(productId: string): string | undefined {
  return getRegistryProduct(productId)?.categoryId;
}

export function computeProductKpis(events: AnalyticsEvent[], limit = 25): ProductKpiRow[] {
  type Row = ProductKpiRow & { viewers: Set<string>; checkoutSessions: Set<string> };
  const byProduct = new Map<string, Row>();

  for (const event of events) {
    const productId = event.productId
      ?? (event.eventType === "PURCHASE" && event.orderIdReference
        ? getOrder(event.orderIdReference)?.items[0]?.productId
        : undefined);
    if (!productId) continue;

    const row = byProduct.get(productId) ?? {
      productId,
      productName: productName(productId),
      categoryId: productCategoryId(productId),
      views: 0,
      addToCart: 0,
      cartConversion: 0,
      checkoutCount: 0,
      purchases: 0,
      unitsSold: 0,
      revenueCents: 0,
      refunds: 0,
      returnRate: 0,
      netRevenueCents: 0,
      contributionCents: 0,
      contributionMarginPercent: 0,
      viewers: new Set<string>(),
      checkoutSessions: new Set<string>(),
    };

    if (event.eventType === "PRODUCT_VIEW") {
      row.views += 1;
      row.viewers.add(event.anonymousVisitorId);
    }
    if (event.eventType === "ADD_TO_CART") row.addToCart += 1;
    if (event.eventType === "CHECKOUT_START" && event.sessionId) row.checkoutSessions.add(event.sessionId);
    if (event.eventType === "RETURN") row.refunds += 1;
    if (isAuthoritativePurchase(event)) {
      row.purchases += 1;
      row.revenueCents += toCents(event.value ?? 0);
      row.unitsSold += event.quantity ?? 1;
      if (event.orderIdReference) {
        const contrib = computeContributionForOrder(event.orderIdReference);
        row.contributionCents += contrib.contributionCents;
      }
    }
    if (isAuthoritativeRefund(event)) {
      row.revenueCents -= toCents(event.value ?? 0);
    }

    byProduct.set(productId, row);
  }

  return [...byProduct.values()]
    .map(({ viewers, checkoutSessions, ...row }) => ({
      ...row,
      checkoutCount: checkoutSessions.size,
      cartConversion: safeRate(row.addToCart, row.views),
      netRevenueCents: row.revenueCents,
      returnRate: safeRate(row.refunds, row.purchases),
      contributionMarginPercent: row.revenueCents > 0
        ? Number(((row.contributionCents / row.revenueCents) * 100).toFixed(2))
        : 0,
    }))
    .sort((a, b) => b.revenueCents - a.revenueCents)
    .slice(0, limit);
}

export function computeCategoryKpis(events: AnalyticsEvent[], limit = 25): CategoryKpiRow[] {
  const products = computeProductKpis(events, 500);
  type MutableCategoryRow = CategoryKpiRow & { refunds: number };
  const byCategory = new Map<string, MutableCategoryRow>();

  for (const p of products) {
    const categoryId = p.categoryId ?? "uncategorized";
    const row = byCategory.get(categoryId) ?? {
      categoryId,
      views: 0,
      addToCart: 0,
      purchases: 0,
      unitsSold: 0,
      revenueCents: 0,
      conversionRate: 0,
      returnRate: 0,
      netRevenueCents: 0,
      refunds: 0,
    };
    row.views += p.views;
    row.addToCart += p.addToCart;
    row.purchases += p.purchases;
    row.unitsSold += p.unitsSold;
    row.revenueCents += p.revenueCents;
    row.refunds += p.refunds;
    byCategory.set(categoryId, row);
  }

  return [...byCategory.values()]
    .map(({ refunds, ...row }) => ({
      ...row,
      conversionRate: safeRate(row.purchases, row.views),
      returnRate: safeRate(refunds, row.purchases),
      netRevenueCents: row.revenueCents,
    }))
    .sort((a, b) => b.revenueCents - a.revenueCents)
    .slice(0, limit);
}

export function computeMarketKpis(events: AnalyticsEvent[]): MarketKpiRow[] {
  const markets = listMarkets();
  const purchases = uniqueOrderPurchases(events);

  return markets.map((market) => {
    const marketEvents = events.filter((e) => e.market === market.countryCode);
    const marketPurchases = purchases.filter((e) => e.market === market.countryCode);
    const sessions = new Set(marketEvents.map((e) => e.sessionId)).size;
    const returns = marketEvents.filter((e) => e.eventType === "RETURN").length;
    const revenueCents = marketPurchases.reduce((sum, e) => sum + toCents(e.value ?? 0), 0);
    let contributionCents = 0;
    for (const p of marketPurchases) {
      if (p.orderIdReference) {
        contributionCents += computeContributionForOrder(p.orderIdReference).contributionCents;
      }
    }
    const refunds = marketEvents
      .filter(isAuthoritativeRefund)
      .reduce((sum, e) => sum + toCents(e.value ?? 0), 0);

    return {
      market: market.countryCode,
      country: market.countryCode,
      currency: market.currency,
      orders: marketPurchases.length,
      revenueCents,
      netRevenueCents: revenueCents - refunds,
      conversionRate: safeRate(marketPurchases.length, sessions),
      averageOrderValueCents: marketPurchases.length
        ? Math.round(revenueCents / marketPurchases.length)
        : 0,
      returns,
      returnRate: safeRate(returns, marketPurchases.length),
      contributionCents,
      contributionMarginPercent: revenueCents > 0
        ? Number(((contributionCents / revenueCents) * 100).toFixed(2))
        : 0,
    };
  }).sort((a, b) => b.revenueCents - a.revenueCents);
}

export function computeLanguageKpis(events: AnalyticsEvent[]): LanguageKpiRow[] {
  const languages = new Set([
    ...CORE_LANGUAGES,
    ...events.map((e) => e.language.split("-")[0].toLowerCase()),
  ]);

  return [...languages].map((language) => {
    const langEvents = events.filter((e) => e.language.split("-")[0].toLowerCase() === language);
    const sessions = new Set(langEvents.map((e) => e.sessionId)).size;
    const visitors = new Set(langEvents.map((e) => e.anonymousVisitorId)).size;
    const purchases = langEvents.filter(isAuthoritativePurchase);
    const revenueCents = purchases.reduce((sum, e) => sum + toCents(e.value ?? 0), 0);

    return {
      language,
      visitors,
      sessions,
      productViews: langEvents.filter((e) => e.eventType === "PRODUCT_VIEW").length,
      addToCart: langEvents.filter((e) => e.eventType === "ADD_TO_CART").length,
      purchases: purchases.length,
      revenueCents,
      conversionRate: safeRate(purchases.length, sessions),
    };
  }).filter((r) => r.sessions > 0 || r.purchases > 0)
    .sort((a, b) => b.revenueCents - a.revenueCents);
}

export function computeCommerceChannelKpis(events: AnalyticsEvent[]): CommerceChannelKpiRow[] {
  const purchases = uniqueOrderPurchases(events);

  return COMMERCE_CHANNELS.map((channel) => {
    const channelPurchases = purchases.filter((p) => {
      if (!p.orderIdReference) return channel === "direct";
      const order = getOrder(p.orderIdReference);
      return (order?.channel ?? "direct") === channel;
    });
    const revenueCents = channelPurchases.reduce((sum, e) => sum + toCents(e.value ?? 0), 0);
    let contributionCents = 0;
    for (const p of channelPurchases) {
      if (p.orderIdReference) {
        contributionCents += computeContributionForOrder(p.orderIdReference).contributionCents;
      }
    }
    const returns = events.filter(
      (e) => e.eventType === "RETURN" && e.metadata?.channel === channel
    ).length;

    return {
      channel,
      orders: channelPurchases.length,
      revenueCents,
      averageOrderValueCents: channelPurchases.length
        ? Math.round(revenueCents / channelPurchases.length)
        : 0,
      returns,
      netRevenueCents: revenueCents,
      contributionCents,
      contributionMarginPercent: revenueCents > 0
        ? Number(((contributionCents / revenueCents) * 100).toFixed(2))
        : 0,
    };
  });
}

export function computeTrafficSourceKpis(events: AnalyticsEvent[]): TrafficSourceKpiRow[] {
  return TRAFFIC_SOURCES.map((source) => {
    const sourceEvents = events.filter((e) => e.trafficSource === source);
    const sessions = new Set(sourceEvents.map((e) => e.sessionId)).size;
    const purchases = sourceEvents.filter(isAuthoritativePurchase);
    const revenueCents = purchases.reduce((sum, e) => sum + toCents(e.value ?? 0), 0);

    return {
      source,
      sessions,
      productViews: sourceEvents.filter((e) => e.eventType === "PRODUCT_VIEW").length,
      addToCart: sourceEvents.filter((e) => e.eventType === "ADD_TO_CART").length,
      checkoutStarts: sourceEvents.filter((e) => e.eventType === "CHECKOUT_START").length,
      purchases: purchases.length,
      revenueCents,
      conversionRate: safeRate(purchases.length, sessions),
    };
  }).filter((r) => r.sessions > 0 || r.purchases > 0);
}

export function computeDeviceKpis(events: AnalyticsEvent[]): DeviceKpiRow[] {
  return DEVICES.map((device) => {
    const deviceEvents = events.filter((e) => e.deviceType === device);
    const sessions = new Set(deviceEvents.map((e) => e.sessionId)).size;
    const purchases = deviceEvents.filter(isAuthoritativePurchase);
    const revenueCents = purchases.reduce((sum, e) => sum + toCents(e.value ?? 0), 0);

    return {
      device,
      sessions,
      productViews: deviceEvents.filter((e) => e.eventType === "PRODUCT_VIEW").length,
      addToCart: deviceEvents.filter((e) => e.eventType === "ADD_TO_CART").length,
      checkoutStarts: deviceEvents.filter((e) => e.eventType === "CHECKOUT_START").length,
      purchases: purchases.length,
      revenueCents,
      conversionRate: safeRate(purchases.length, sessions),
    };
  }).filter((r) => r.sessions > 0 || r.purchases > 0);
}
