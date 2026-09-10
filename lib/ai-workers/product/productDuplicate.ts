import type { ProductEngineProduct } from "@/lib/product-engine/types";
import { findDuplicateProduct } from "@/lib/product-engine/duplicate";
import type { DuplicateSignal, ProductAiInput } from "./types";

function inputToEngineProduct(input: ProductAiInput): ProductEngineProduct {
  return {
    productId: input.productId,
    sku: input.productId,
    ean: input.ean,
    gtin: input.gtin,
    mpn: input.mpn,
    brand: input.brand ?? "",
    categoryId: input.category ?? "",
    productType: input.productType ?? "general",
    status: "DRAFT",
    technicalData: input.attributes,
    compatibility: input.compatibility as unknown as ProductEngineProduct["compatibility"],
    translations: input.existingTranslations.map((t) => ({
      locale: t.locale,
      name: t.title ?? "",
      description: t.description,
    })),
    supplierOffers: [],
    pricing: {
      supplierCost: 0,
      shippingCost: 0,
      marketplaceFee: 0,
      paymentFee: 0,
      vat: 0,
      margin: 0,
      customerPrice: 0,
      currency: "EUR",
    },
    stock: { quantity: 0, availability: "UNKNOWN", lastUpdated: new Date().toISOString() },
    availability: [],
    images: [],
    seo: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function detectDuplicateSignals(input: ProductAiInput): DuplicateSignal[] {
  const candidate = inputToEngineProduct(input);
  const result = findDuplicateProduct(candidate);

  if (!result.match) {
    return [{
      duplicateCandidate: false,
      matchType: null,
      confidence: 0,
      reasons: ["No duplicate signals detected"],
      classification: "FACT",
    }];
  }

  return [{
    duplicateCandidate: true,
    matchType: result.method,
    confidence: result.confidence,
    matchedProductId: result.existingProductId,
    reasons: [
      `Duplicate match via ${result.method}`,
      result.existingProductId ? `Matched product: ${result.existingProductId}` : "",
    ].filter(Boolean),
    classification: "DERIVED_VALUE",
  }];
}

export function titleSimilarity(a: string, b: string): number {
  const na = a.toLowerCase().replace(/[^a-z0-9]/g, "");
  const nb = b.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!na || !nb) return 0;
  const shorter = na.length < nb.length ? na : nb;
  const longer = na.length >= nb.length ? na : nb;
  return shorter.length / longer.length;
}
