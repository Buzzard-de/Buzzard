import { getProduct, getProductsForMarket } from "@/lib/product-engine";
import { getMarket } from "@/lib/market-engine/registry";
import { hasCapability, getMarketplace } from "./registry";
import { getMarketplacePrice } from "./price";
import { getMarketplaceStock } from "./inventory";
import { resolveMarketplaceCategory } from "./mapping";
import type { PublishEligibilityInput, PublishEligibilityResult } from "./types";

export function evaluatePublishEligibility(input: PublishEligibilityInput): PublishEligibilityResult {
  const reasons: string[] = [];
  const mp = getMarketplace(input.marketplaceId);
  if (!mp) {
    return { eligible: false, reasons: ["MARKETPLACE_NOT_FOUND"] };
  }

  if (!hasCapability(input.marketplaceId, "productListing")) {
    reasons.push("CAPABILITY_NOT_SUPPORTED:productListing");
  }

  const market = getMarket(input.marketId);
  if (!market) {
    reasons.push("MARKET_NOT_FOUND");
  } else if (!mp.supportedMarkets.includes(input.marketId)) {
    reasons.push("MARKET_NOT_SUPPORTED_BY_MARKETPLACE");
  }

  const product = getProduct(input.productId);
  if (!product) {
    reasons.push("PRODUCT_NOT_FOUND");
    return { eligible: false, reasons };
  }

  if (!product.ean) reasons.push("MISSING_EAN");
  const productName = product.translations?.[0]?.name;
  if (!productName) reasons.push("MISSING_TITLE");

  const offer = product.supplierOffers?.[0];
  if (!offer) {
    reasons.push("NO_SUPPLIER_OFFER");
  } else {
    const price = getMarketplacePrice({
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
    if (!price.ok) reasons.push(`PRICING_INVALID:${price.errorMessage}`);

    const stock = getMarketplaceStock({
      productId: input.productId,
      supplierId: offer.supplierId,
      supplierOfferId: offer.supplierSku,
      marketplaceId: input.marketplaceId,
    });
    if (stock.publishedQuantity <= 0) reasons.push("OUT_OF_STOCK");
  }

  if (product.categoryId) {
    const cat = resolveMarketplaceCategory(input.marketplaceId, input.marketId, product.categoryId);
    if (!cat) reasons.push("MISSING_CATEGORY_MAPPING");
  }

  return { eligible: reasons.length === 0, reasons };
}

export function listPublishableProducts(marketId: string, marketplaceId: string): string[] {
  return getProductsForMarket(marketId)
    .map((p) => p.productId)
    .filter((productId) => evaluatePublishEligibility({ productId, marketplaceId, marketId }).eligible);
}
