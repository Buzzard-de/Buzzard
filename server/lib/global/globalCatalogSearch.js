/**
 * Global catalog search — loads PIM products for /api/global/search.
 * Read-only; no publish side effects.
 */
const productCore = require("../pim/productCore");
const { extractProductIdentity } = require("./productIdentity");

function mapPimProductForSearch(product) {
  if (!product) return null;
  const attrs = product.attributes || {};
  const metadata = product.metadata || {};
  const translations = metadata.translations || attrs.translations || {};
  const fitments = metadata.fitments || attrs.fitments || attrs.compatibleVehicles || [];
  const identity = extractProductIdentity({
    ...product,
    brand: product.brand?.name || product.manufacturer,
  });

  return {
    productId: product.id,
    sku: identity.sku,
    gtin: identity.gtin || product.gtin,
    ean: identity.ean || product.ean,
    mpn: identity.mpn || product.mpn,
    brand: identity.brand || product.brand?.name || product.manufacturer,
    title: product.title,
    description: product.description || product.shortDescription,
    translations,
    categoryId: product.category || product.pimCategoryId,
    subCategory: product.subcategory,
    supplierCategory: metadata.supplierCategory || attrs.supplierCategory,
    buzzardCategory: metadata.buzzardCategory || attrs.buzzardCategory,
    compatibleVehicles: Array.isArray(fitments) ? fitments : [],
    oemReferences: metadata.oemReferences || attrs.oemReferences || [],
    status: product.status,
    countryAvailability: metadata.countryAvailability || attrs.countryAvailability,
    primaryImage: product.images?.[0]?.url || product.images?.[0]?.src,
    images: product.images,
  };
}

function loadSearchCatalog(options = {}) {
  const limit = Math.min(Number(options.limit) || 1000, 2000);
  const status = options.status;
  const rows = productCore.listProducts({ status, limit });
  return rows.map(mapPimProductForSearch).filter(Boolean);
}

module.exports = {
  mapPimProductForSearch,
  loadSearchCatalog,
};
