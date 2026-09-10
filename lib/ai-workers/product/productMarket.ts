import { getMarket, getMarketLanguages, getMarketStatus } from "@/lib/market-engine/registry";
import { getMarketplace, listMarketplaces } from "@/lib/marketplace-engine/registry";
import type {
  MarketReadinessResult,
  MarketplaceReadinessEntry,
  ProductAiInput,
  ProductQualityScores,
} from "./types";
import { MARKETPLACE_CHANNELS, MARKETPLACE_ID_MAP, MARKETPLACE_REQUIRED_FIELDS, MARKET_REQUIRED_FIELDS } from "./constants";

function checkRequiredFields(
  input: ProductAiInput,
  fields: readonly string[]
): string[] {
  const missing: string[] = [];
  for (const field of fields) {
    switch (field) {
      case "title":
        if (!input.title?.trim()) missing.push("title");
        break;
      case "description":
        if (!input.description?.trim()) missing.push("description");
        break;
      case "brand":
        if (!input.brand?.trim()) missing.push("brand");
        break;
      case "category":
        if (!input.category?.trim()) missing.push("category");
        break;
      case "ean":
        if (!input.ean?.trim() && !input.gtin?.trim()) missing.push("ean");
        break;
      case "imagesMetadata":
        if (!input.imagesMetadata.length) missing.push("imagesMetadata");
        break;
    }
  }
  return missing;
}

export function analyzeMarketReadiness(
  input: ProductAiInput,
  scores: ProductQualityScores
): MarketReadinessResult {
  const market = input.market ?? "DE";
  const marketConfig = getMarket(market);
  const missingFields = checkRequiredFields(input, MARKET_REQUIRED_FIELDS);
  const reasons: string[] = [];

  if (!marketConfig) {
    return {
      status: "NOT_READY",
      market,
      missingFields: [...missingFields, "marketConfig"],
      reasons: ["Market not found in Market Engine"],
    };
  }

  const status = getMarketStatus(market);
  if (status === "PLANNED") {
    reasons.push("Market status is PLANNED");
  }

  const langs = getMarketLanguages(market);
  const hasTranslation = input.existingTranslations.some((t) =>
    langs.some((l) => t.locale.startsWith(l))
  );
  if (!hasTranslation) {
    missingFields.push("translation");
    reasons.push("Missing translation for market languages");
  }

  if (scores.qualityScore >= 80 && missingFields.length === 0 && status !== "PLANNED") {
    return { status: "READY", market, missingFields: [], reasons: ["Product meets market field requirements"] };
  }

  if (missingFields.length <= 2 && scores.qualityScore >= 50) {
    return {
      status: "NEEDS_REVIEW",
      market,
      missingFields,
      reasons: reasons.length ? reasons : ["Minor gaps in market readiness"],
    };
  }

  return {
    status: "NOT_READY",
    market,
    missingFields,
    reasons: reasons.length ? reasons : ["Critical market readiness gaps"],
  };
}

export function analyzeMarketplaceReadiness(input: ProductAiInput): MarketplaceReadinessEntry[] {
  const entries: MarketplaceReadinessEntry[] = [];

  for (const channel of MARKETPLACE_CHANNELS) {
    const marketplaceId = MARKETPLACE_ID_MAP[channel];
    const marketplace = getMarketplace(marketplaceId);
    const missingDataSignals = checkRequiredFields(input, MARKETPLACE_REQUIRED_FIELDS);

    if (!marketplace) {
      entries.push({
        channel,
        marketplaceId,
        status: "NOT_READY",
        missingDataSignals: [...missingDataSignals, "marketplaceNotRegistered"],
        recommendations: ["Register marketplace in Marketplace Engine"],
      });
      continue;
    }

    const marketSupported = input.market
      ? marketplace.supportedMarkets.includes(input.market)
      : true;

    if (!marketSupported) {
      missingDataSignals.push("marketNotSupported");
    }

    let status: MarketplaceReadinessEntry["status"];
    if (missingDataSignals.length === 0 && marketSupported) {
      status = "READY";
    } else if (missingDataSignals.length <= 2) {
      status = "NEEDS_REVIEW";
    } else {
      status = "NOT_READY";
    }

    entries.push({
      channel,
      marketplaceId,
      status,
      missingDataSignals,
      recommendations: missingDataSignals.map((f) => `Provide ${f} for ${channel} listing`),
    });
  }

  return entries;
}

export function listRegisteredMarketplacesForMarket(market: string): string[] {
  return listMarketplaces()
    .filter((m) => m.supportedMarkets.includes(market))
    .map((m) => m.marketplaceId);
}
