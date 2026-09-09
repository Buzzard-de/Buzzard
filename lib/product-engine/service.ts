import type {
  NormalizeSupplierInput,
  ProductEngineProduct,
  ProductEngineStatus,
  SupplierOffer,
} from "./types";
import {
  getRegistryProduct,
  getRegistryProductByEan,
  getRegistryProductBySku,
  listRegistryProducts,
  upsertRegistryProduct,
} from "./registry";
import { validateProduct } from "./validation";
import { ingestSupplierProduct } from "./ingestion";
import { normalizeSupplierProduct, normalizedRecordToEngineProduct } from "./normalization";
import { updateSupplierOffer, selectBestSupplier } from "./supplier";
import { isProductAvailableInMarket } from "./availability";
import { createProductSnapshot } from "./snapshot";
import { sanitizeClientProductUpdate } from "./security";
import { emitProductEvent } from "./events";
import { canTransitionStatus } from "./status";

export function getProduct(productId: string): ProductEngineProduct | undefined {
  return getRegistryProduct(productId);
}

export function getProductBySku(sku: string): ProductEngineProduct | undefined {
  return getRegistryProductBySku(sku);
}

export function getProductByEan(ean: string): ProductEngineProduct | undefined {
  return getRegistryProductByEan(ean);
}

export function searchProducts(query: string): ProductEngineProduct[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return listRegistryProducts().filter((p) => {
    const de = p.translations.find((t) => t.locale.startsWith("de"));
    return (
      p.productId.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      (de?.name || "").toLowerCase().includes(q) ||
      (p.ean || "").includes(q)
    );
  });
}

export function getProductsByCategory(categoryId: string): ProductEngineProduct[] {
  return listRegistryProducts().filter(
    (p) => p.categoryId === categoryId || p.subcategoryId === categoryId
  );
}

export function getProductsForMarket(countryCode: string): ProductEngineProduct[] {
  return listRegistryProducts().filter((p) => isProductAvailableInMarket(p, countryCode).available);
}

export function createProduct(product: ProductEngineProduct): ProductEngineProduct {
  const validation = validateProduct(product);
  if (!validation.valid) product.status = "PENDING_REVIEW";
  const saved = upsertRegistryProduct(product);
  emitProductEvent("PRODUCT_CREATED", saved.productId);
  return saved;
}

export function updateProduct(
  productId: string,
  patch: Partial<ProductEngineProduct>,
  trusted = false
): ProductEngineProduct | undefined {
  const existing = getRegistryProduct(productId);
  if (!existing) return undefined;

  const safePatch = trusted ? patch : sanitizeClientProductUpdate(existing, patch);
  const updated = upsertRegistryProduct({ ...existing, ...safePatch, productId });
  emitProductEvent("PRODUCT_UPDATED", productId);
  return updated;
}

export function setProductStatus(
  productId: string,
  status: ProductEngineStatus
): ProductEngineProduct | undefined {
  const existing = getRegistryProduct(productId);
  if (!existing) return undefined;
  if (!canTransitionStatus(existing.status, status)) return existing;

  const updated = upsertRegistryProduct({ ...existing, status });
  if (status === "ACTIVE") emitProductEvent("PRODUCT_ACTIVATED", productId);
  if (status === "PAUSED") emitProductEvent("PRODUCT_PAUSED", productId);
  if (status === "DISCONTINUED") emitProductEvent("PRODUCT_DISCONTINUED", productId);
  return updated;
}

export function updateProductSupplierOffer(
  productId: string,
  supplierId: string,
  patch: Partial<Pick<SupplierOffer, "supplierPrice" | "currency" | "stock" | "leadTimeDays">>
): ProductEngineProduct | undefined {
  const existing = getRegistryProduct(productId);
  if (!existing) return undefined;
  return upsertRegistryProduct(updateSupplierOffer(existing, supplierId, patch));
}

export function normalizeAndIngestSupplierProduct(input: NormalizeSupplierInput) {
  return ingestSupplierProduct(input);
}

export {
  validateProduct,
  ingestSupplierProduct,
  normalizeSupplierProduct,
  normalizedRecordToEngineProduct,
  selectBestSupplier,
  isProductAvailableInMarket,
  createProductSnapshot,
};
