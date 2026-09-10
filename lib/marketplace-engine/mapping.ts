import { getProduct } from "@/lib/product-engine";
import {
  generateMappingId,
  getCategoryMapping,
  saveCategoryMapping,
  saveProductMapping,
} from "./registry";
import type {
  AttributeMappingEntry,
  CategoryMapping,
  MarketplaceProductMapping,
} from "./types";

const TECHNICAL_ATTRIBUTES = new Set([
  "ean",
  "gtin",
  "mpn",
  "sku",
  "tireSize",
  "viscosity",
  "apiSpec",
  "dimensions",
  "weight",
  "brakeDimensions",
]);

export function createCategoryMapping(input: {
  marketplaceId: string;
  marketId: string;
  buzzardCategoryId: string;
  marketplaceCategoryId: string;
}): CategoryMapping {
  const now = new Date().toISOString();
  const mapping: CategoryMapping = {
    mappingId: generateMappingId(),
    marketplaceId: input.marketplaceId,
    marketId: input.marketId,
    buzzardCategoryId: input.buzzardCategoryId,
    marketplaceCategoryId: input.marketplaceCategoryId,
    status: "ACTIVE",
    createdAt: now,
    updatedAt: now,
  };
  saveCategoryMapping(mapping);
  return mapping;
}

export function resolveMarketplaceCategory(
  marketplaceId: string,
  marketId: string,
  buzzardCategoryId: string
): string | undefined {
  return getCategoryMapping(marketplaceId, marketId, buzzardCategoryId)?.marketplaceCategoryId;
}

export function mapAttributes(
  productAttributes: Record<string, string>,
  mappings: AttributeMappingEntry[]
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const entry of mappings) {
    const value = productAttributes[entry.buzzardAttribute];
    if (value == null) continue;
    if (TECHNICAL_ATTRIBUTES.has(entry.buzzardAttribute)) {
      result[entry.marketplaceAttribute] = value;
      continue;
    }
    switch (entry.transform) {
      case "uppercase":
        result[entry.marketplaceAttribute] = value.toUpperCase();
        break;
      case "lowercase":
        result[entry.marketplaceAttribute] = value.toLowerCase();
        break;
      default:
        result[entry.marketplaceAttribute] = value;
    }
  }
  return result;
}

export function buildDefaultAttributeMappings(): AttributeMappingEntry[] {
  return [
    { buzzardAttribute: "brand", marketplaceAttribute: "brand" },
    { buzzardAttribute: "ean", marketplaceAttribute: "ean", transform: "identity" },
    { buzzardAttribute: "mpn", marketplaceAttribute: "mpn", transform: "identity" },
    { buzzardAttribute: "gtin", marketplaceAttribute: "gtin", transform: "identity" },
    { buzzardAttribute: "color", marketplaceAttribute: "color" },
    { buzzardAttribute: "size", marketplaceAttribute: "size" },
    { buzzardAttribute: "weight", marketplaceAttribute: "weight", transform: "identity" },
    { buzzardAttribute: "tireSize", marketplaceAttribute: "tire_size", transform: "identity" },
    { buzzardAttribute: "viscosity", marketplaceAttribute: "viscosity", transform: "identity" },
    { buzzardAttribute: "apiSpec", marketplaceAttribute: "api_specification", transform: "identity" },
    { buzzardAttribute: "brakeDimensions", marketplaceAttribute: "brake_dimensions", transform: "identity" },
  ];
}

export function createProductMapping(input: {
  productId: string;
  marketplaceId: string;
  marketId: string;
  marketplaceListingId?: string;
  marketplaceSku?: string;
  buzzardCategoryId?: string;
  marketplaceCategoryId?: string;
  titleMapping?: Record<string, string>;
  descriptionMapping?: Record<string, string>;
  attributeMapping?: AttributeMappingEntry[];
}): MarketplaceProductMapping {
  const product = getProduct(input.productId);
  const now = new Date().toISOString();
  const mapping: MarketplaceProductMapping = {
    mappingId: generateMappingId(),
    productId: input.productId,
    marketplaceId: input.marketplaceId,
    marketplaceListingId: input.marketplaceListingId,
    marketplaceSku: input.marketplaceSku ?? product?.sku,
    ean: product?.ean,
    status: "DRAFT",
    marketId: input.marketId,
    categoryMapping: input.buzzardCategoryId && input.marketplaceCategoryId
      ? { buzzardCategoryId: input.buzzardCategoryId, marketplaceCategoryId: input.marketplaceCategoryId }
      : undefined,
    titleMapping: input.titleMapping,
    descriptionMapping: input.descriptionMapping,
    attributeMapping: input.attributeMapping ?? buildDefaultAttributeMappings(),
    createdAt: now,
    updatedAt: now,
  };
  saveProductMapping(mapping);
  return mapping;
}

export function resolveListingTitle(
  productId: string,
  marketId: string,
  language: string,
  titleMapping?: Record<string, string>
): string {
  const product = getProduct(productId);
  if (!product) return "";
  const mapped = titleMapping?.[`${marketId}:${language}`] ?? titleMapping?.[language];
  if (mapped) return mapped;
  return product.translations?.[0]?.name ?? productId;
}

export function resolveListingDescription(
  productId: string,
  marketId: string,
  language: string,
  descriptionMapping?: Record<string, string>
): string {
  const product = getProduct(productId);
  if (!product) return "";
  const mapped = descriptionMapping?.[`${marketId}:${language}`] ?? descriptionMapping?.[language];
  if (mapped) return mapped;
  return product.translations?.[0]?.description ?? product.translations?.[0]?.shortDescription ?? "";
}
