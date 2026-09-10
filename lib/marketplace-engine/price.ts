import { calculatePrice } from "@/lib/pricing-engine/price";
import { getMarket } from "@/lib/market-engine/registry";
import { getProduct } from "@/lib/product-engine";
import { getMarketplace } from "./registry";
import type { PricingChannel } from "@/lib/pricing-engine/types";

export interface MarketplacePriceResult {
  ok: boolean;
  price?: number;
  currency?: string;
  customerNetPrice?: number;
  customerGrossPrice?: number;
  vatAmount?: number;
  pricingStatus?: string;
  errorMessage?: string;
}

export function resolveMarketplaceChannel(marketplaceId: string): PricingChannel | undefined {
  const mp = getMarketplace(marketplaceId);
  return mp?.supportedChannels[0];
}

export function getMarketplacePrice(input: {
  productId: string;
  marketplaceId: string;
  marketId: string;
  supplierId: string;
  supplierOfferId: string;
  supplierPrice: number;
  supplierCurrency: string;
  stock: number;
  categoryId?: string;
}): MarketplacePriceResult {
  const mp = getMarketplace(input.marketplaceId);
  if (!mp) {
    return { ok: false, errorMessage: "MARKETPLACE_NOT_FOUND" };
  }

  const market = getMarket(input.marketId);
  if (!market) {
    return { ok: false, errorMessage: "MARKET_NOT_FOUND" };
  }

  const channel = resolveMarketplaceChannel(input.marketplaceId);
  if (!channel) {
    return { ok: false, errorMessage: "CHANNEL_NOT_CONFIGURED" };
  }

  const product = getProduct(input.productId);
  const pricing = calculatePrice({
    productId: input.productId,
    marketId: input.marketId,
    channel,
    currency: market.currency,
    supplierId: input.supplierId,
    supplierOfferId: input.supplierOfferId,
    categoryId: input.categoryId ?? product?.categoryId,
    supplierOffer: {
      supplierSku: input.supplierOfferId,
      supplierPrice: input.supplierPrice,
      currency: input.supplierCurrency,
      stock: input.stock,
      lastUpdated: new Date().toISOString(),
    },
  });

  if (pricing.pricingStatus !== "VALID" || !pricing.customerGrossPrice) {
    return {
      ok: false,
      pricingStatus: pricing.pricingStatus,
      errorMessage: pricing.pricingStatus,
    };
  }

  return {
    ok: true,
    price: pricing.customerGrossPrice,
    currency: pricing.currency,
    customerNetPrice: pricing.customerNetPrice,
    customerGrossPrice: pricing.customerGrossPrice,
    vatAmount: pricing.customerVat,
    pricingStatus: pricing.pricingStatus,
  };
}
