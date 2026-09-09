import type { ProductEngineAdminRow } from "./types";
import { listRegistryProducts } from "./registry";
import { getActiveMarkets } from "./availability";
import { getTranslationForLocale } from "./translations";

export function getProductEngineAdminOverview(): ProductEngineAdminRow[] {
  return listRegistryProducts().map((product) => {
    const de = getTranslationForLocale(product.translations, "de");
    const markets = getActiveMarkets(product);
    return {
      productId: product.productId,
      sku: product.sku,
      brand: product.brand,
      name: de?.name || product.productId,
      status: product.status,
      supplierCount: product.supplierOffers.length,
      stock: product.stock.quantity,
      customerPrice: `${product.pricing.customerPrice.toFixed(2)} ${product.pricing.currency}`,
      markets: markets.length ? markets.join(", ") : "—",
      categoryId: product.categoryId,
    };
  });
}
