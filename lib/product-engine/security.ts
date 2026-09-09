import type { ProductEngineProduct, SupplierOffer } from "./types";

const TRUSTED_SERVER_FIELDS = new Set([
  "productId",
  "sku",
  "status",
  "updatedAt",
  "createdAt",
]);

/** Strip untrusted client mutations from critical commercial fields. */
export function sanitizeClientProductUpdate(
  existing: ProductEngineProduct,
  clientPatch: Partial<ProductEngineProduct>
): Partial<ProductEngineProduct> {
  const safe: Partial<ProductEngineProduct> = {};

  if (clientPatch.translations) safe.translations = clientPatch.translations;
  if (clientPatch.images) safe.images = clientPatch.images;
  if (clientPatch.compatibility) safe.compatibility = clientPatch.compatibility;
  if (clientPatch.technicalData) safe.technicalData = clientPatch.technicalData;
  if (clientPatch.categoryId) safe.categoryId = clientPatch.categoryId;
  if (clientPatch.subcategoryId) safe.subcategoryId = clientPatch.subcategoryId;

  // Never trust client-provided pricing, stock, supplier offers, or status directly
  return {
    ...safe,
    productId: existing.productId,
    sku: existing.sku,
    pricing: existing.pricing,
    stock: existing.stock,
    supplierOffers: existing.supplierOffers,
    status: existing.status,
  };
}

export function validateServerSupplierOffer(offer: SupplierOffer): boolean {
  if (!offer.supplierId?.trim()) return false;
  if (!offer.supplierSku?.trim()) return false;
  if (offer.supplierPrice < 0) return false;
  if (offer.stock < 0) return false;
  if (!offer.currency?.trim()) return false;
  return true;
}

export function assertTrustedField(field: string): boolean {
  return TRUSTED_SERVER_FIELDS.has(field);
}
