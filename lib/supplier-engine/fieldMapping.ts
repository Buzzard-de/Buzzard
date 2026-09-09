import type { SupplierFieldMapping } from "./types";

const DEFAULT_MAPPING: SupplierFieldMapping = {
  article_number: "supplierSku",
  sku: "supplierSku",
  supplier_sku: "supplierSku",
  ean_code: "ean",
  ean: "ean",
  ean_gtin: "ean",
  gtin: "gtin",
  mpn: "mpn",
  price_net: "supplierPrice",
  purchase_price: "supplierPrice",
  supplier_price: "supplierPrice",
  stock_qty: "stock",
  stock: "stock",
  title: "name",
  name: "name",
  brand_name: "brand",
  brand: "brand",
  description: "description",
  short_description: "shortDescription",
  supplier_category: "supplierCategory",
};

export function applyFieldMapping(
  raw: Record<string, unknown>,
  mapping: SupplierFieldMapping = {}
): Record<string, unknown> {
  const merged = { ...DEFAULT_MAPPING, ...mapping };
  const result: Record<string, unknown> = { ...raw };

  for (const [supplierField, buzzardField] of Object.entries(merged)) {
    if (supplierField in raw && !(buzzardField in result)) {
      result[buzzardField] = raw[supplierField];
    }
  }

  // Normalize price object
  if (typeof result.supplierPrice === "number") {
    result.purchase_price = result.supplierPrice;
    result.supplier_price = { amount: result.supplierPrice, currency: raw.currency || "EUR" };
  }

  // Normalize sku fields for PIM normalizer
  if (result.supplierSku && !result.supplier_sku) {
    result.supplier_sku = result.supplierSku;
  }

  return result;
}

export function validateMappedRecord(mapped: Record<string, unknown>): string[] {
  const errors: string[] = [];
  if (!mapped.supplierSku && !mapped.supplier_sku) errors.push("MISSING_SUPPLIER_SKU");
  const price = mapped.supplierPrice ?? (mapped.supplier_price as { amount?: number })?.amount;
  if (price != null && Number(price) < 0) errors.push("INVALID_PRICE");
  const stock = mapped.stock;
  if (stock != null && Number(stock) < 0) errors.push("INVALID_STOCK");
  return errors;
}
