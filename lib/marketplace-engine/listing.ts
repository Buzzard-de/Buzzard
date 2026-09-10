import { getProduct } from "@/lib/product-engine";
import { getMarket } from "@/lib/market-engine/registry";
import { getMarketplaceConnector } from "./connector";
import {
  generateListingId,
  getListing,
  saveListing,
  saveProductMapping,
} from "./registry";
import {
  buildDefaultAttributeMappings,
  createProductMapping,
  mapAttributes,
  resolveListingDescription,
  resolveListingTitle,
  resolveMarketplaceCategory,
} from "./mapping";
import { getMarketplacePrice } from "./price";
import { getMarketplaceStock } from "./inventory";
import { evaluatePublishEligibility } from "./product";
import { emitMarketplaceEvent } from "./events";
import { recordMarketplaceAudit } from "./audit";
import type { ListingPayload, ListingStatus, MarketplaceListing } from "./types";

const TECHNICAL_ONLY = new Set(["ean", "gtin", "mpn", "sku", "tire_size", "viscosity", "api_specification", "brake_dimensions"]);

export interface ListingValidationResult {
  valid: boolean;
  errors: string[];
  status: ListingStatus;
}

export function validateListingPayload(input: {
  productId: string;
  marketplaceId: string;
  marketId: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  stock: number;
  ean?: string;
  categoryId?: string;
  language: string;
}): ListingValidationResult {
  const errors: string[] = [];

  if (!input.ean) errors.push("MISSING_EAN");
  if (!input.title?.trim()) errors.push("MISSING_TITLE");
  if (!input.description?.trim()) errors.push("MISSING_DESCRIPTION");
  if (!input.price || input.price <= 0) errors.push("MISSING_PRICE");
  if (!input.currency) errors.push("MISSING_CURRENCY");
  if (input.stock < 0) errors.push("INVALID_STOCK");
  if (!input.categoryId) errors.push("MISSING_CATEGORY");
  if (!input.language) errors.push("MISSING_LANGUAGE");

  const market = getMarket(input.marketId);
  if (!market) errors.push("UNSUPPORTED_MARKET");
  else if (market.currency !== input.currency) errors.push("CURRENCY_MISMATCH");

  const status: ListingStatus =
    errors.length === 0
      ? input.stock <= 0
        ? "OUT_OF_STOCK"
        : "READY"
      : errors.some((e) => ["MISSING_EAN", "MISSING_TITLE", "MISSING_CATEGORY"].includes(e))
        ? "REVIEW_REQUIRED"
        : "ERROR";

  return { valid: errors.length === 0, errors, status };
}

export function buildListingPayload(input: {
  productId: string;
  marketplaceId: string;
  marketId: string;
  language?: string;
}): { payload?: ListingPayload; validation: ListingValidationResult } {
  const product = getProduct(input.productId);
  if (!product) {
    return { validation: { valid: false, errors: ["PRODUCT_NOT_FOUND"], status: "ERROR" } };
  }

  const offer = product.supplierOffers?.[0];
  if (!offer) {
    return { validation: { valid: false, errors: ["NO_SUPPLIER_OFFER"], status: "ERROR" } };
  }

  const market = getMarket(input.marketId)!;
  const language = input.language ?? market.defaultLanguage;

  const priceResult = getMarketplacePrice({
    productId: input.productId,
    marketplaceId: input.marketplaceId,
    marketId: input.marketId,
    supplierId: offer.supplierId,
    supplierOfferId: offer.supplierSku,
    supplierPrice: offer.supplierPrice,
    supplierCurrency: offer.currency,
    stock: offer.stock,
    categoryId: product.categoryId,
  });

  const stockResult = getMarketplaceStock({
    productId: input.productId,
    supplierId: offer.supplierId,
    supplierOfferId: offer.supplierSku,
    marketplaceId: input.marketplaceId,
  });

  const categoryId = product.categoryId
    ? resolveMarketplaceCategory(input.marketplaceId, input.marketId, product.categoryId)
    : undefined;

  const attributeMapping = buildDefaultAttributeMappings();
  const productAttrs: Record<string, string> = {
    brand: product.brand ?? "",
    ean: product.ean ?? "",
    mpn: product.mpn ?? "",
    sku: product.sku ?? "",
  };
  const attributes = mapAttributes(productAttrs, attributeMapping);

  const payload: ListingPayload = {
    marketplaceId: input.marketplaceId,
    marketId: input.marketId,
    productId: input.productId,
    title: resolveListingTitle(input.productId, input.marketId, language),
    description: resolveListingDescription(input.productId, input.marketId, language),
    price: priceResult.price ?? 0,
    currency: priceResult.currency ?? market.currency,
    stock: stockResult.publishedQuantity,
    ean: product.ean,
    marketplaceSku: `${input.marketplaceId}-${product.sku}`,
    categoryId,
    attributes,
    language,
    dryRun: true,
  };

  const validation = validateListingPayload({
    productId: input.productId,
    marketplaceId: input.marketplaceId,
    marketId: input.marketId,
    title: payload.title,
    description: payload.description,
    price: payload.price,
    currency: payload.currency,
    stock: payload.stock,
    ean: payload.ean,
    categoryId: payload.categoryId,
    language: payload.language,
  });

  return { payload, validation };
}

export async function createListing(input: {
  productId: string;
  marketplaceId: string;
  marketId: string;
  language?: string;
}): Promise<{ ok: boolean; listing?: MarketplaceListing; errorCode?: string; errorMessage?: string }> {
  const eligibility = evaluatePublishEligibility(input);
  if (!eligibility.eligible) {
    return {
      ok: false,
      errorCode: "VALIDATION_FAILED",
      errorMessage: eligibility.reasons.join(", "),
    };
  }

  const { payload, validation } = buildListingPayload(input);
  if (!payload || !validation.valid) {
    return {
      ok: false,
      errorCode: "VALIDATION_FAILED",
      errorMessage: validation.errors.join(", "),
    };
  }

  const connector = getMarketplaceConnector(input.marketplaceId);
  const result = await connector.createListing(payload);
  if (!result.ok || !result.data) {
    return { ok: false, errorCode: result.errorCode ?? "CONNECTOR_ERROR", errorMessage: result.errorMessage };
  }

  const now = new Date().toISOString();
  const listing: MarketplaceListing = {
    listingId: generateListingId(),
    productId: input.productId,
    marketplaceId: input.marketplaceId,
    marketId: input.marketId,
    marketplaceListingId: result.data.marketplaceListingId,
    marketplaceSku: payload.marketplaceSku,
    status: validation.status === "READY" ? "ACTIVE" : validation.status,
    title: payload.title,
    description: payload.description,
    price: payload.price,
    currency: payload.currency,
    stock: payload.stock,
    ean: payload.ean,
    categoryId: payload.categoryId,
    attributes: payload.attributes,
    language: payload.language,
    validationErrors: validation.errors,
    lastSyncedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  saveListing(listing);

  const mapping = createProductMapping({
    productId: input.productId,
    marketplaceId: input.marketplaceId,
    marketId: input.marketId,
    marketplaceListingId: listing.marketplaceListingId,
    marketplaceSku: listing.marketplaceSku,
    buzzardCategoryId: getProduct(input.productId)?.categoryId,
    marketplaceCategoryId: payload.categoryId,
  });
  saveProductMapping({ ...mapping, status: listing.status, updatedAt: now });

  emitMarketplaceEvent({
    marketplaceId: input.marketplaceId,
    type: "LISTING_CREATED",
    source: "marketplace-engine",
    metadata: { listingId: listing.listingId, productId: input.productId },
  });
  recordMarketplaceAudit({
    marketplaceId: input.marketplaceId,
    actor: "marketplace-engine",
    action: "LISTING_CREATED",
    relatedListingId: listing.listingId,
  });

  return { ok: true, listing };
}

export async function updateListing(
  listingId: string
): Promise<{ ok: boolean; listing?: MarketplaceListing; errorMessage?: string }> {
  const existing = getListing(listingId);
  if (!existing) return { ok: false, errorMessage: "LISTING_NOT_FOUND" };

  const { payload, validation } = buildListingPayload({
    productId: existing.productId,
    marketplaceId: existing.marketplaceId,
    marketId: existing.marketId,
    language: existing.language,
  });

  if (!payload) return { ok: false, errorMessage: "PAYLOAD_BUILD_FAILED" };

  const connector = getMarketplaceConnector(existing.marketplaceId);
  const result = await connector.updateListing(existing.marketplaceListingId, payload);
  if (!result.ok) return { ok: false, errorMessage: result.errorMessage };

  const updated: MarketplaceListing = {
    ...existing,
    title: payload.title,
    description: payload.description,
    price: payload.price,
    currency: payload.currency,
    stock: payload.stock,
    status: validation.status === "READY" && payload.stock > 0 ? "ACTIVE" : validation.status,
    validationErrors: validation.errors,
    lastSyncedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  saveListing(updated);

  emitMarketplaceEvent({
    marketplaceId: existing.marketplaceId,
    type: "LISTING_UPDATED",
    source: "marketplace-engine",
    metadata: { listingId },
  });

  return { ok: true, listing: updated };
}

export async function pauseListing(listingId: string): Promise<{ ok: boolean }> {
  const listing = getListing(listingId);
  if (!listing) return { ok: false };

  const connector = getMarketplaceConnector(listing.marketplaceId);
  await connector.pauseListing(listing.marketplaceListingId);

  saveListing({
    ...listing,
    status: "PAUSED",
    updatedAt: new Date().toISOString(),
  });

  emitMarketplaceEvent({
    marketplaceId: listing.marketplaceId,
    type: "LISTING_PAUSED",
    source: "marketplace-engine",
    metadata: { listingId },
  });

  return { ok: true };
}

export function isTechnicalAttribute(key: string): boolean {
  return TECHNICAL_ONLY.has(key);
}
