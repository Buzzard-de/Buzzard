import { getVatContext } from "@/lib/market-engine/vat";
import { grossFromNet, netFromGross, roundMoney } from "@/lib/market-engine/money";
import type { VatContext } from "@/lib/market-engine/types";
import { getDefaultSellerCountry } from "./registry";

export interface VatBreakdown {
  taxContext: VatContext;
  customerNetPrice: number;
  customerVat: number;
  customerGrossPrice: number;
}

/**
 * Apply Market Engine VAT context to a net selling price.
 * Does NOT duplicate VAT logic — delegates to market-engine.
 */
export function applyVatToNetPrice(
  netPrice: number,
  options: {
    marketId: string;
    sellerCountry?: string;
    customerType?: "B2C" | "B2B";
    vatId?: string;
    priceIncludesVat?: boolean;
  }
): VatBreakdown {
  const sellerCountry = options.sellerCountry ?? getDefaultSellerCountry();
  const taxContext = getVatContext({
    sellerCountry,
    buyerCountry: options.marketId,
    customerType: options.customerType ?? "B2C",
    vatId: options.vatId,
  });

  if (taxContext.reverseCharge || taxContext.rate === 0) {
    return {
      taxContext,
      customerNetPrice: roundMoney(netPrice),
      customerVat: 0,
      customerGrossPrice: roundMoney(netPrice),
    };
  }

  const { gross, vat } = grossFromNet(netPrice, taxContext.rate);
  return {
    taxContext,
    customerNetPrice: roundMoney(netPrice),
    customerVat: vat,
    customerGrossPrice: gross,
  };
}

/** Derive net from a gross price using market VAT context. */
export function netFromGrossPrice(
  grossPrice: number,
  options: {
    marketId: string;
    sellerCountry?: string;
    customerType?: "B2C" | "B2B";
  }
): VatBreakdown {
  const sellerCountry = options.sellerCountry ?? getDefaultSellerCountry();
  const taxContext = getVatContext({
    sellerCountry,
    buyerCountry: options.marketId,
    customerType: options.customerType ?? "B2C",
  });

  if (taxContext.reverseCharge || taxContext.rate === 0) {
    return {
      taxContext,
      customerNetPrice: roundMoney(grossPrice),
      customerVat: 0,
      customerGrossPrice: roundMoney(grossPrice),
    };
  }

  const { net, vat } = netFromGross(grossPrice, taxContext.rate);
  return {
    taxContext,
    customerNetPrice: net,
    customerVat: vat,
    customerGrossPrice: roundMoney(grossPrice),
  };
}
