import { calculateDisplayPrice } from "@/lib/market-engine/price";
import { calculatePrice } from "@/lib/pricing-engine/price";
import type { PricingChannel } from "@/lib/pricing-engine/types";
import type { ProductEngineProduct, ProductPricing } from "./types";
import { roundMoney } from "@/lib/market-engine/money";
import { selectBestSupplier } from "./supplier";

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
    productId?: string;
    supplierId?: string;
    channel?: PricingChannel;
    categoryId?: string;
  }
): ProductPricing {
  const currency = options?.currency ?? "EUR";
  const countryCode = options?.countryCode ?? "DE";

  if (options?.productId && options?.supplierId) {
    const result = calculatePrice({
      productId: options.productId,
      supplierId: options.supplierId,
      marketId: countryCode,
      channel: options.channel ?? "direct",
      currency,
      categoryId: options.categoryId,
      supplierOffer: {
        supplierPrice: supplierCost,
        currency,
        stock: 1,
        lastUpdated: new Date().toISOString(),
      },
      _testOverrides: {
        shippingCost: options.shippingCost,
        targetMarginPercent: options.marginTarget,
      },
    });

    if (result.pricingStatus === "VALID") {
      return {
        supplierCost: roundMoney(result.supplierNetPrice),
        shippingCost: roundMoney(result.shippingCost),
        marketplaceFee: roundMoney(result.marketplaceFee),
        paymentFee: roundMoney(result.paymentFee),
        vat: result.taxContext.rate,
        margin: result.buzzardContributionMargin,
        customerPrice: result.customerGrossPrice,
        currency: result.currency,
      };
    }
  }

  const shippingCost = options?.shippingCost ?? 0;
  const marketplaceFee = options?.marketplaceFee ?? 0;
  const paymentFee = options?.paymentFee ?? 0;
  const vatRate = options?.vatRate ?? 0.19;
  const marginTarget = options?.marginTarget ?? 0.11;
  const baseCost = roundMoney(supplierCost + shippingCost + marketplaceFee + paymentFee);
  const netPrice = marginTarget < 1 ? roundMoney(baseCost / (1 - marginTarget)) : baseCost;
  const customerPrice = roundMoney(netPrice * (1 + vatRate));
  const margin = customerPrice > 0 ? roundMoney((netPrice - baseCost) / netPrice) : 0;

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
  const best = selectBestSupplier(product);
  if (!best) return product;

  const result = calculatePrice({
    productId: product.productId,
    supplierId: best.offer.supplierId,
    marketId: "DE",
    channel: "direct",
    categoryId: product.categoryId,
    supplierOffer: {
      supplierPrice: best.offer.supplierPrice,
      currency: best.offer.currency,
      stock: best.offer.stock,
      lastUpdated: best.offer.lastUpdated,
      supplierSku: best.offer.supplierSku,
    },
  });

  if (result.pricingStatus !== "VALID") return product;

  return {
    ...product,
    pricing: {
      supplierCost: result.supplierNetPrice,
      shippingCost: result.shippingCost,
      marketplaceFee: result.marketplaceFee,
      paymentFee: result.paymentFee,
      vat: result.taxContext.rate,
      margin: result.buzzardContributionMargin,
      customerPrice: result.customerGrossPrice,
      currency: result.currency,
    },
    updatedAt: new Date().toISOString(),
  };
}
