/**
 * Part 16 — Supplier-neutral product normalization.
 * Converts heterogeneous supplier payloads into a canonical staging schema.
 * NEVER generates GTIN/EAN/MPN.
 */
const { normalizeSupplierProduct } = require("../supplier/realSupplierConnector");

function pickImages(raw) {
  if (Array.isArray(raw.images)) return raw.images.filter(Boolean);
  if (raw.image_url) return [raw.image_url];
  if (raw.primary_image) return [raw.primary_image];
  if (raw.imageUrl) return [raw.imageUrl];
  return [];
}

function pickPrice(raw) {
  if (raw.supplier_price && typeof raw.supplier_price === "object") {
    return {
      purchasePrice: Number(raw.supplier_price.amount),
      currency: raw.supplier_price.currency || "EUR",
    };
  }
  if (raw.purchase_price != null) {
    return { purchasePrice: Number(raw.purchase_price), currency: raw.currency || "EUR" };
  }
  if (raw.cost != null) {
    return { purchasePrice: Number(raw.cost), currency: raw.currency || "EUR" };
  }
  if (raw.price != null && typeof raw.price === "object") {
    return { purchasePrice: Number(raw.price.amount), currency: raw.price.currency || "EUR" };
  }
  if (raw.price != null) {
    return { purchasePrice: Number(raw.price), currency: raw.currency || "EUR" };
  }
  return { purchasePrice: null, currency: raw.currency || "EUR" };
}

function pickRetailPrice(raw) {
  if (raw.retail_price && typeof raw.retail_price === "object") {
    return { amount: Number(raw.retail_price.amount), currency: raw.retail_price.currency || "EUR" };
  }
  if (raw.rrp != null) return { amount: Number(raw.rrp), currency: raw.currency || "EUR" };
  if (raw.recommended_price != null) return { amount: Number(raw.recommended_price), currency: raw.currency || "EUR" };
  return null;
}

function normalizeSupplierProductRecord(raw, { supplierCode, sourceProductId, importJobId } = {}) {
  const base = normalizeSupplierProduct(raw, supplierCode);
  const pricing = pickPrice(raw);
  const retail = pickRetailPrice(raw);

  return {
    schemaVersion: "1.0",
    supplierCode: supplierCode || base.supplierCode || null,
    sourceProductId: sourceProductId || raw.source_product_id || raw.id || raw.article_id || null,
    supplierSku: base.supplierSku || raw.supplier_sku || raw.sku || "",
    sku: raw.internal_sku || raw.buzzard_sku || null,
    ean: base.ean || null,
    gtin: base.gtin || null,
    mpn: base.mpn || null,
    brand: base.brand || null,
    manufacturer: raw.manufacturer || base.brand || null,
    title: base.title || "",
    description: base.description || raw.short_description || "",
    shortDescription: raw.short_description || raw.shortDescription || "",
    supplierCategory: raw.supplier_category || raw.category || base.category || null,
    buzzardCategory: raw.buzzard_category || raw.taxonomy_category_id || null,
    purchasePrice: pricing.purchasePrice,
    retailPrice: retail?.amount ?? null,
    currency: pricing.currency || "EUR",
    stock: Number.isFinite(base.stock) ? base.stock : null,
    stockStatus: base.availability || null,
    images: pickImages(raw),
    primaryImage: pickImages(raw)[0] || null,
    attributes: raw.attributes || {},
    vehicleFitment: base.vehicleFitment || [],
    tecdocArticle: base.tecdocArticle || null,
    oemNumbers: Array.isArray(raw.oem_numbers) ? raw.oem_numbers : raw.oem_number ? [raw.oem_number] : [],
    importJobId: importJobId || null,
    rawSnapshot: raw,
  };
}

module.exports = {
  normalizeSupplierProductRecord,
  pickImages,
  pickPrice,
};
