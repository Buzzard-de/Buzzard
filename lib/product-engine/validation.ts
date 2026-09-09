import type { ProductEngineProduct, ProductValidationResult } from "./types";
import { hasRequiredTranslation } from "./translations";
import { validateTechnicalConsistency } from "./technicalData";
import { validateProductImages } from "./images";

function isValidEan(ean?: string): boolean {
  if (!ean) return false;
  return /^\d{8,14}$/.test(ean.replace(/\s/g, ""));
}

export function validateProduct(product: ProductEngineProduct): ProductValidationResult {
  const errors: ProductValidationResult["errors"] = [];
  const warnings: ProductValidationResult["warnings"] = [];

  if (!product.sku?.trim()) errors.push({ field: "sku", code: "SKU_MISSING", message: "SKU is required" });
  if (!product.brand?.trim()) errors.push({ field: "brand", code: "BRAND_MISSING", message: "Brand is required" });
  if (!product.categoryId?.trim()) {
    errors.push({ field: "categoryId", code: "CATEGORY_MISSING", message: "Category is required" });
  }
  if (!product.supplierOffers.length) {
    errors.push({ field: "supplierOffers", code: "SUPPLIER_MISSING", message: "At least one supplier offer required" });
  }
  if (!isValidEan(product.ean) && !isValidEan(product.gtin)) {
    warnings.push({ field: "ean", code: "EAN_MISSING", message: "EAN/GTIN not provided" });
  }
  if (product.pricing.customerPrice <= 0) {
    errors.push({ field: "pricing", code: "PRICE_INVALID", message: "Customer price must be positive" });
  }
  if (!hasRequiredTranslation(product.translations)) {
    warnings.push({ field: "translations", code: "TRANSLATION_MISSING", message: "Default translation incomplete" });
  }

  for (const warning of validateTechnicalConsistency(product.technicalData)) {
    warnings.push({ field: "technicalData", code: warning, message: warning });
  }
  for (const imgErr of validateProductImages(product.images)) {
    warnings.push({ field: "images", code: imgErr, message: imgErr });
  }

  const valid = errors.length === 0;
  const status = valid
    ? product.status === "DRAFT"
      ? "PENDING_REVIEW"
      : product.status
    : "PENDING_REVIEW";

  return { valid, status, errors, warnings };
}
