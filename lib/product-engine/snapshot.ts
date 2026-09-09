import { getVatContext } from "@/lib/market-engine/vat";
import type { ProductEngineProduct, ProductSnapshot } from "./types";
import { getTranslationForLocale } from "./translations";
import { selectBestSupplier } from "./supplier";

export function createProductSnapshot(
  product: ProductEngineProduct,
  options?: {
    countryCode?: string;
    sellerCountry?: string;
    customerType?: "B2C" | "B2B";
  }
): ProductSnapshot {
  const best = selectBestSupplier(product, { countryCode: options?.countryCode ?? "DE" });
  const offer = best?.offer ?? product.supplierOffers[0];
  const de = getTranslationForLocale(product.translations, "de");

  const taxContext = getVatContext({
    sellerCountry: options?.sellerCountry ?? "DE",
    buyerCountry: options?.countryCode ?? "DE",
    customerType: options?.customerType ?? "B2C",
  });

  return {
    snapshotId: `snap_${product.productId}_${Date.now()}`,
    productId: product.productId,
    sku: product.sku,
    ean: product.ean || product.gtin,
    name: de?.name || product.productId,
    supplierId: offer?.supplierId || "",
    supplierSku: offer?.supplierSku || "",
    purchasePrice: offer?.supplierPrice ?? product.pricing.supplierCost,
    customerPrice: product.pricing.customerPrice,
    currency: product.pricing.currency,
    taxContext,
    capturedAt: new Date().toISOString(),
  };
}
