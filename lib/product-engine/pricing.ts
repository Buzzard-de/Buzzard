import { calculateDisplayPrice } from "@/lib/market-engine/price";
import type { ProductEngineProduct, ProductPricing } from "./types";
import { roundMoney } from "@/lib/market-engine/money";

export function buildProductPricing(
  supplierCost: number,
  options?: {
    shippingCost?: number;
    marketplaceFee?: number;
    paymentFee?: number;
    vatRate?: number;
    marginTarget?: number;
    currency?: string;
    countryCode?: string;
  }
): ProductPricing {
  const currency = options?.currency ?? "EUR";
  const shippingCost = options?.shippingCost ?? 0;
  const marketplaceFee = options?.marketplaceFee ?? 0;
  const paymentFee = options?.paymentFee ?? 0;
  const vatRate = options?.vatRate ?? 0.19;
  const marginTarget = options?.marginTarget ?? 0.25;

  const baseCost = roundMoney(supplierCost + shippingCost + marketplaceFee + paymentFee);
  const customerPrice = roundMoney(baseCost * (1 + marginTarget) * (1 + vatRate));
  const margin = customerPrice > 0 ? roundMoney((customerPrice - baseCost) / customerPrice) : 0;

  return {
    supplierCost: roundMoney(supplierCost),
    shippingCost: roundMoney(shippingCost),
    marketplaceFee: roundMoney(marketplaceFee),
    paymentFee: roundMoney(paymentFee),
    vat: vatRate,
    margin,
    customerPrice,
    currency,
  };
}

export function calculateProductDisplayPrice(
  product: ProductEngineProduct,
  options?: { countryCode?: string; quantity?: number; customerType?: "B2C" | "B2B" }
) {
  return calculateDisplayPrice(
    {
      amount: product.pricing.customerPrice,
      currency: product.pricing.currency,
      priceIncludesVat: true,
      quantity: options?.quantity ?? 1,
    },
    {
      countryCode: options?.countryCode ?? "DE",
      customerType: options?.customerType ?? "B2C",
    }
  );
}

export function recalculatePricingFromBestOffer(product: ProductEngineProduct): ProductEngineProduct {
  const bestOffer = product.supplierOffers.reduce(
    (best, o) => (o.stock > 0 && (!best || o.supplierPrice < best.supplierPrice) ? o : best),
    null as (typeof product.supplierOffers)[0] | null
  );
  if (!bestOffer) return product;
  return {
    ...product,
    pricing: buildProductPricing(bestOffer.supplierPrice, {
      currency: bestOffer.currency,
      vatRate: product.pricing.vat,
      marginTarget: product.pricing.margin || 0.25,
    }),
  };
}
