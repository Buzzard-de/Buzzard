import type { LiveSupplierProfile } from "../../liveSupplier/types";
import { applyFieldMapping } from "../../fieldMapping";
import { normalizeSupplierImages } from "./images";

const UNKNOWN = "UNKNOWN";
const REVIEW_REQUIRED = "REVIEW_REQUIRED";

export function mapBuzzardCategory(
  rawCategory: unknown,
  categoryMapping: Record<string, string> = {}
): string {
  const value = String(rawCategory || "").trim();
  if (!value) return REVIEW_REQUIRED;
  return categoryMapping[value] || REVIEW_REQUIRED;
}

export function normalizeB2bSandboxRecord(
  raw: Record<string, unknown>,
  profile: LiveSupplierProfile
): Record<string, unknown> {
  const mapped = applyFieldMapping(raw, profile.fieldMapping);

  const supplierSku = String(mapped.supplierSku || mapped.supplier_sku || UNKNOWN);
  const ean = mapped.ean || mapped.gtin ? String(mapped.ean || mapped.gtin) : UNKNOWN;
  const gtin = mapped.gtin ? String(mapped.gtin) : ean !== UNKNOWN ? ean : UNKNOWN;
  const mpn = mapped.mpn ? String(mapped.mpn) : UNKNOWN;
  const brand = mapped.brand ? String(mapped.brand) : UNKNOWN;

  const priceRaw = mapped.supplierPrice ?? (mapped.supplier_price as { amount?: number })?.amount;
  const purchasePrice =
    priceRaw != null && Number.isFinite(Number(priceRaw)) ? Number(priceRaw) : undefined;

  const stockRaw = mapped.stock ?? mapped.stock_qty;
  const stock = stockRaw != null && Number.isFinite(Number(stockRaw)) ? Number(stockRaw) : undefined;

  const images = normalizeSupplierImages(mapped.images || mapped.image_urls || mapped.image);

  const vehicleFitment = Array.isArray(mapped.vehicleFitment || mapped.vehicle_compatibility || mapped.fitment)
    ? (mapped.vehicleFitment || mapped.vehicle_compatibility || mapped.fitment)
    : [];

  return {
    ...mapped,
    supplierSku,
    supplier_sku: supplierSku,
    ean: ean === UNKNOWN ? undefined : ean,
    gtin: gtin === UNKNOWN ? undefined : gtin,
    mpn: mpn === UNKNOWN ? undefined : mpn,
    brand: brand === UNKNOWN ? undefined : brand,
    name: mapped.name || mapped.title || supplierSku,
    supplierPrice: purchasePrice,
    purchase_price: purchasePrice,
    supplier_price: purchasePrice != null ? { amount: purchasePrice, currency: profile.currency } : undefined,
    stock,
    stock_qty: stock,
    currency: profile.currency,
    priceIncludesVat: profile.priceIncludesVat === true,
    buzzardCategory: mapBuzzardCategory(mapped.supplierCategory || mapped.category, profile.categoryMapping),
    images,
    vehicleFitment,
    oemNumbers: mapped.oemNumbers || mapped.oem_numbers || mapped.oem || undefined,
    liveSource: true,
  };
}
