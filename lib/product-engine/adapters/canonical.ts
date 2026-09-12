import { createRequire } from "module";
import path from "path";
import type { ProductEngineProduct } from "../types";

const require = createRequire(import.meta.url);
const canonicalModelPath = path.join(process.cwd(), "server/lib/global/productCanonicalModel.js");
const { normalizeCanonicalProduct, toFlatCanonicalProduct } = require(canonicalModelPath);

export { normalizeCanonicalProduct, toFlatCanonicalProduct };

export function engineProductToCanonicalInput(product: ProductEngineProduct): Record<string, unknown> {
  const de = product.translations.find((t) => t.locale.startsWith("de")) ?? product.translations[0];
  return {
    id: product.productId,
    sku: product.sku,
    ean: product.ean,
    gtin: product.gtin,
    mpn: product.mpn,
    brand: product.brand,
    manufacturer: product.manufacturer,
    category: product.categoryId,
    subcategory: product.subcategoryId,
    title: de?.name,
    description: de?.description,
    status: product.status,
    stock: product.stock.quantity,
    supplier: product.supplierOffers[0]?.supplierId,
    price: product.pricing.customerPrice,
    images: product.images.map((i) => i.url),
    compatibleVehicles: product.compatibility,
    attributes: product.technicalData,
    translations: Object.fromEntries(
      product.translations.map((t) => [
        t.locale.split("-")[0],
        {
          title: t.name,
          description: t.description,
          shortDescription: t.shortDescription,
          seo: { title: t.seoTitle, description: t.seoDescription, slug: t.slug },
        },
      ])
    ),
    seo: product.seo.reduce(
      (acc, s) => {
        acc[s.locale] = { title: s.seoTitle, description: s.seoDescription, slug: s.slug };
        return acc;
      },
      {} as Record<string, unknown>
    ),
  };
}

export function engineProductToCanonical(product: ProductEngineProduct) {
  return normalizeCanonicalProduct(engineProductToCanonicalInput(product));
}

export function engineProductToFlat(product: ProductEngineProduct) {
  return toFlatCanonicalProduct(engineProductToCanonicalInput(product));
}
