/**
 * Automotive Core — canonical product model.
 */
const { normalizeCanonicalProduct } = require("../../lib/global/productCanonicalModel");
const categoryEngine = require("./categoryEngine");
const { AUTOMOTIVE_CORE_SAFETY } = require("./safetyPolicy");

function normalizeAutomotiveProduct(raw = {}) {
  const canonical = normalizeCanonicalProduct(raw);
  const categoryId = raw.categoryId || raw.automotiveCategoryId || raw.category;
  const catValidation = categoryEngine.validateCategoryPath(
    categoryId,
    raw.subCategoryId,
    raw.subSubCategoryId,
    raw.productType
  );

  return {
    id: raw.id || raw.sku,
    sku: canonical.identity.sku,
    supplierSku: raw.supplierSku || raw.supplier_sku || null,
    categoryId,
    subCategoryId: raw.subCategoryId || null,
    subSubCategoryId: raw.subSubCategoryId || null,
    productType: raw.productType || null,
    brand: canonical.identity.brand,
    manufacturer: raw.manufacturer || canonical.identity.brand,
    title: canonical.content.title,
    shortDescription: raw.shortDescription || null,
    description: canonical.content.description,
    translations: canonical.localization.translations,
    slug: canonical.localization.localizedSeo?.de?.slug || raw.slug || null,
    seo: canonical.localization.localizedSeo || raw.seo || {},
    images: canonical.media.images,
    documents: raw.documents || [],
    identifiers: {
      ean: canonical.identity.ean,
      gtin: canonical.identity.gtin,
      mpn: canonical.identity.mpn,
      oem: raw.oem || raw.oemNumber || null,
      manufacturerPartNumber: raw.manufacturerPartNumber || raw.mpn || null,
      supplierPartNumber: raw.supplierPartNumber || raw.supplierSku || null,
    },
    fitment: canonical.automotive.vehicleCompatibility,
    attributes: raw.attributes || {},
    supplier: raw.supplier || { id: raw.supplierId, name: raw.supplierName },
    pricing: raw.pricing || { blocked: true, reason: "sales_disabled" },
    inventory: raw.inventory || { status: "UNKNOWN" },
    shipping: raw.shipping || {},
    validation: { category: catValidation },
    workflow: {
      status: raw.status || "DRAFT",
      manualPublish: Boolean(raw.manualPublish),
      publishAllowed: false,
      approved: raw.status === "APPROVED",
      published: raw.status === "PUBLISHED",
    },
    audit: raw.audit || { updatedAt: new Date().toISOString() },
    safety: AUTOMOTIVE_CORE_SAFETY,
  };
}

function listAutomotiveProducts(products = []) {
  return products.map((p) => normalizeAutomotiveProduct(p));
}

module.exports = {
  normalizeAutomotiveProduct,
  listAutomotiveProducts,
};
