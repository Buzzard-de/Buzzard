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

function getLanguageReadiness(product = {}, languageCode = "de") {
  const canonical = normalizeCanonicalProduct(product);
  const tr = canonical.localization.translations[languageCode] || {};
  const title = tr.title || (languageCode === "de" ? canonical.content.title : "");
  const description = tr.description || (languageCode === "de" ? canonical.content.description : "");
  const seo = tr.seo || canonical.localization.localizedSeo[languageCode] || {};
  const fields = [title, description, seo.title, seo.description, seo.slug].filter(Boolean);
  return {
    language: languageCode,
    title: title || null,
    description: description || null,
    shortDescription: tr.shortDescription || null,
    seoTitle: seo.title || null,
    seoDescription: seo.description || null,
    slug: seo.slug || null,
    completeness: fields.length >= 3 ? "PARTIAL" : fields.length > 0 ? "MINIMAL" : "MISSING",
    translated: Boolean(tr.title || tr.description),
  };
}

/** Flat canonical product contract for storefront/admin APIs. */
function toFlatCanonicalProduct(raw = {}) {
  const c = normalizeCanonicalProduct(raw);
  const attrs = raw.attributes || {};
  const metadata = raw.metadata || {};
  return {
    id: raw.id || raw.productId,
    sku: c.identity.sku,
    brand: c.identity.brand,
    manufacturer: raw.manufacturer || c.identity.brand,
    mpn: c.identity.mpn,
    gtin: c.identity.gtin,
    ean: c.identity.ean,
    title: c.content.title,
    description: c.content.description,
    shortDescription: raw.shortDescription || raw.short_description,
    categoryId: c.taxonomy.mainCategory,
    subcategoryId: c.taxonomy.subCategory,
    subSubcategoryId: c.taxonomy.subSubCategory,
    automotiveCategoryId: metadata.automotiveCategoryId || attrs.automotiveCategoryId,
    images: c.media.images,
    documents: raw.documents || [],
    vehicleCompatibility: c.automotive.vehicleCompatibility,
    translations: c.localization.translations,
    seo: c.localization.localizedSeo,
    supplier: c.commercial.supplier,
    countryAvailability: metadata.countryAvailability || attrs.countryAvailability || {},
    pricing: { state: c.commercial.priceState, amount: raw.price, currency: raw.currency },
    stock: raw.stock,
    status: c.workflow.status,
    validation: raw.validation || null,
    workflow: c.workflow,
  };
}

module.exports = {
  normalizeCanonicalProduct,
  toFlatCanonicalProduct,
  getLanguageReadiness,
};
