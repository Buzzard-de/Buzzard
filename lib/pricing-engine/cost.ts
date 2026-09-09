import { convertCurrency } from "./currency";
import { roundMoney } from "@/lib/market-engine/money";
import type { PricingInput } from "./types";

export interface ResolvedSupplierCost {
  supplierNetPrice: number;
  supplierGrossPrice: number;
  supplierCurrency: string;
  marketCurrency: string;
  convertedNetPrice: number;
  lastUpdated: string;
  stock: number;
  valid: boolean;
  reason?: string;
}

/**
 * Resolve supplier cost from a trusted supplier offer.
 * Never accepts client-supplied prices without server validation.
 */
export function resolveSupplierCost(
  input: PricingInput,
  marketCurrency: string
): ResolvedSupplierCost {
  const offer = input.supplierOffer;
  if (!offer || offer.supplierPrice == null || offer.supplierPrice <= 0) {
    return {
      supplierNetPrice: 0,
      supplierGrossPrice: 0,
      supplierCurrency: offer?.currency ?? "",
      marketCurrency,
      convertedNetPrice: 0,
      lastUpdated: offer?.lastUpdated ?? "",
      stock: offer?.stock ?? 0,
      valid: false,
      reason: "MISSING_COST",
    };
  }
  if (!offer.currency) {
    return {
      supplierNetPrice: offer.supplierPrice,
      supplierGrossPrice: offer.supplierPrice,
      supplierCurrency: "",
      marketCurrency,
      convertedNetPrice: 0,
      lastUpdated: offer.lastUpdated,
      stock: offer.stock,
      valid: false,
      reason: "MISSING_CURRENCY",
    };
  }

  const supplierNetPrice = roundMoney(offer.supplierPrice);
  const converted = convertCurrency(supplierNetPrice, offer.currency, marketCurrency);
  if (converted == null) {
    return {
      supplierNetPrice,
      supplierGrossPrice: supplierNetPrice,
      supplierCurrency: offer.currency,
      marketCurrency,
      convertedNetPrice: 0,
      lastUpdated: offer.lastUpdated,
      stock: offer.stock,
      valid: false,
      reason: "MISSING_CURRENCY",
    };
  }

  return {
    supplierNetPrice,
    supplierGrossPrice: supplierNetPrice,
    supplierCurrency: offer.currency,
    marketCurrency,
    convertedNetPrice: converted,
    lastUpdated: offer.lastUpdated,
    stock: offer.stock,
    valid: true,
  };
}
