import { createRequire } from "module";
import type { NormalizeSupplierInput, ProductEngineProduct, SupplierOffer } from "./types";
import { createProductTranslation } from "./translations";
import { normalizeCompatibilityList } from "./compatibility";
import { normalizeProductImages } from "./images";
import { normalizeTechnicalData } from "./technicalData";
import { buildProductPricing } from "./pricing";

const require = createRequire(import.meta.url);

export interface NormalizedSupplierRecord {
  supplierCode: string;
  supplierSku: string;
  sku?: string | null;
  ean?: string | null;
  gtin?: string | null;
  mpn?: string | null;
  brand?: string | null;
  title: string;
  description?: string;
  purchasePrice?: number | null;
  currency: string;
  stock?: number | null;
  images: string[];
  vehicleFitment: unknown[];
  oemNumbers: string[];
  buzzardCategory?: string | null;
}

/** Delegate to existing PIM normalizer — no duplicate normalization logic. */
export function normalizeSupplierProduct(input: NormalizeSupplierInput): NormalizedSupplierRecord {
  const { normalizeSupplierProductRecord } = require("../../server/lib/pim/supplierProductNormalizer.js");
  return normalizeSupplierProductRecord(input.raw, {
    supplierCode: input.supplierId,
    sourceProductId: input.sourceProductId,
  });
}

export function normalizedRecordToEngineProduct(
  normalized: NormalizedSupplierRecord,
  input: NormalizeSupplierInput
): ProductEngineProduct {
  const now = new Date().toISOString();
  const stock = Number(normalized.stock ?? 0);
  const supplierOffer: SupplierOffer = {
    supplierId: input.supplierId,
    supplierSku: normalized.supplierSku,
    supplierEan: normalized.ean || undefined,
    supplierPrice: normalized.purchasePrice ?? 0,
    currency: normalized.currency || "EUR",
    stock,
    lastUpdated: now,
    source: input.supplierId,
    sourceType: input.sourceType,
  };

  const technicalData = normalizeTechnicalData({
    ...(normalized.oemNumbers?.length ? { oem: normalized.oemNumbers.join(",") } : {}),
    ...(normalized.mpn ? { mpn: normalized.mpn } : {}),
  });

  return {
    productId: normalized.sku || `draft_${normalized.supplierSku}`,
    sku: normalized.sku || normalized.supplierSku,
    ean: normalized.ean || undefined,
    gtin: normalized.gtin || normalized.ean || undefined,
    mpn: normalized.mpn || undefined,
    brand: normalized.brand || "",
    categoryId: normalized.buzzardCategory || "",
    productType: "general",
    status: "PENDING_REVIEW",
    images: normalizeProductImages(normalized.images, normalized.title),
    technicalData,
    compatibility: normalizeCompatibilityList(normalized.vehicleFitment),
    translations: [
      createProductTranslation("de-DE", {
        name: normalized.title,
        description: normalized.description,
      }),
    ],
    supplierOffers: [supplierOffer],
    pricing: buildProductPricing(normalized.purchasePrice ?? 0, { currency: normalized.currency }),
    stock: {
      quantity: stock,
      availability: stock > 0 ? "IN_STOCK" : "OUT_OF_STOCK",
      lastUpdated: now,
    },
    availability: [],
    seo: [],
    createdAt: now,
    updatedAt: now,
  };
}
