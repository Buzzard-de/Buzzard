/**
 * Unified product canonical model — identity, taxonomy, content, localization, media, automotive, commercial.
 */
const { extractProductIdentity } = require("./productIdentity");

function normalizeCanonicalProduct(raw = {}) {
  const attrs = raw.attributes || {};
  const metadata = raw.metadata || {};
  const identity = extractProductIdentity({
    ...raw,
    brand: raw.brand?.name || raw.brand || raw.manufacturer,
  });

  return {
    identity: {
      sku: identity.sku,
      gtin: identity.gtin || raw.gtin,
      ean: identity.ean || raw.ean,
      mpn: identity.mpn || raw.mpn,
      brand: identity.brand || raw.brand?.name || raw.manufacturer,
    },
    taxonomy: {
      country: raw.country || metadata.country,
      mainCategory: raw.category || raw.mainCategory || raw.taxonomy_category_id,
      subCategory: raw.subcategory || raw.subCategory,
      subSubCategory: raw.subSubCategory || metadata.subSubCategory,
      supplierCategory: raw.supplierCategory || metadata.supplierCategory || attrs.supplierCategory,
      categoryResolution: raw.categoryResolution || metadata.categoryResolution,
    },
    content: {
      title: raw.title || raw.name,
      description: raw.description,
      features: raw.features || attrs.features || [],
      specifications: raw.specifications || attrs.specifications || {},
    },
    localization: {
      translations: metadata.translations || attrs.translations || raw.translations || {},
      localizedTitles: metadata.localizedTitles || {},
      localizedDescriptions: metadata.localizedDescriptions || {},
      localizedSeo: raw.seo || metadata.seo || {},
    },
    media: {
      images: raw.images || [],
      imageAlt: raw.imageAlt || metadata.imageAlt,
      imageStatus: metadata.imageStatus || attrs.imageStatus,
    },
    automotive: {
      vehicleCompatibility: metadata.fitments || attrs.fitments || raw.compatibleVehicles || [],
      make: raw.make || metadata.make,
      model: raw.model || metadata.model,
      generation: raw.generation || metadata.generation,
      yearFrom: raw.yearFrom || metadata.yearFrom,
      yearTo: raw.yearTo || metadata.yearTo,
      engine: raw.engine || metadata.engine,
      fuel: raw.fuel || metadata.fuel,
      body: raw.body || metadata.body,
      kW: raw.kW || metadata.kW,
      PS: raw.PS || metadata.PS,
      oemReferences: metadata.oemReferences || attrs.oemReferences || [],
    },
    commercial: {
      priceState: raw.price != null ? "PRESENT" : "MISSING",
      availability: raw.stock != null ? (raw.stock > 0 ? "IN_STOCK" : "OUT_OF_STOCK") : "UNKNOWN",
      supplier: raw.supplier || raw.supplierCode || raw.supplier_id,
      shippingInformation: metadata.shippingInformation || attrs.shippingInformation,
    },
    workflow: {
      status: raw.status || "DRAFT",
      manualPublish: false,
      publishAllowed: false,
    },
  };
}

module.exports = {
  normalizeCanonicalProduct,
};
