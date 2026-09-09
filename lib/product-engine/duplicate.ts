import type { DuplicateMatchResult, ProductEngineProduct } from "./types";
import { getRegistryProductByEan, listRegistryProducts } from "./registry";

function normalizePartNumber(value?: string): string | null {
  if (!value) return null;
  return value.replace(/[\s\-_.]/g, "").toUpperCase();
}

export function compareProducts(a: ProductEngineProduct, b: ProductEngineProduct): DuplicateMatchResult {
  if (a.productId === b.productId) {
    return { match: true, method: "gtin", existingProductId: b.productId, confidence: 1 };
  }

  const gtinA = a.gtin || a.ean;
  const gtinB = b.gtin || b.ean;
  if (gtinA && gtinB && gtinA === gtinB) {
    return { match: true, method: "gtin", existingProductId: b.productId, confidence: 0.99 };
  }

  const mpnA = normalizePartNumber(a.mpn || a.oem);
  const mpnB = normalizePartNumber(b.mpn || b.oem);
  if (mpnA && mpnB && mpnA === mpnB) {
    return { match: true, method: "mpn_oem", existingProductId: b.productId, confidence: 0.9 };
  }

  const brandMpnA = a.brand && mpnA ? `${a.brand.toUpperCase()}::${mpnA}` : null;
  const brandMpnB = b.brand && mpnB ? `${b.brand.toUpperCase()}::${mpnB}` : null;
  if (brandMpnA && brandMpnB && brandMpnA === brandMpnB) {
    return { match: true, method: "brand_mpn", existingProductId: b.productId, confidence: 0.85 };
  }

  const attrA = JSON.stringify(Object.entries(a.technicalData).sort());
  const attrB = JSON.stringify(Object.entries(b.technicalData).sort());
  if (attrA === attrB && attrA !== "[]" && a.brand === b.brand) {
    return { match: true, method: "attributes", existingProductId: b.productId, confidence: 0.6 };
  }

  return { match: false, method: null, confidence: 0 };
}

export function findDuplicateProduct(candidate: ProductEngineProduct): DuplicateMatchResult {
  const ean = candidate.ean || candidate.gtin;
  if (ean) {
    const byEan = getRegistryProductByEan(ean);
    if (byEan && byEan.productId !== candidate.productId) {
      return { match: true, method: "ean", existingProductId: byEan.productId, confidence: 0.99 };
    }
  }

  for (const existing of listRegistryProducts()) {
    if (existing.productId === candidate.productId) continue;
    const result = compareProducts(candidate, existing);
    if (result.match) return result;
  }

  return { match: false, method: null, confidence: 0 };
}
