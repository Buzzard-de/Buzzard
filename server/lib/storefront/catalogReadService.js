/**
 * Part 7 — Central read-only catalog service (PIM Core → Storefront)
 * Storefront must NOT access SQLite/PIM tables directly — use this layer only.
 */
const productCore = require("../pim/productCore");
const categoryEngine = require("../pim/categoryEngine");
const brandService = require("../pim/brandService");
const { mapPimToStorefront } = require("./publicProductMapper");
const { isProductVisibleOnStorefront } = require("./storefrontVisibility");
const catalogCache = require("./catalogCache");
const { sortProducts, filterProducts, buildFilterFacets } = require("./filterSort");
const {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  SORT_OPTIONS,
  isStorefrontBridgeEnabled,
} = require("../../core/storefrontConstants");

function loadVisiblePimProducts({ preview = false } = {}) {
  const rows = productCore.listProducts({ limit: 1000 });
  return rows.filter((p) => isProductVisibleOnStorefront(p, { preview }));
}

function resolveCategoryFilter(categoryParam) {
  if (!categoryParam) return null;
  const cat = categoryEngine.findTaxonomyCategory(categoryParam);
  return cat?.id || categoryParam;
}

function matchesCategory(product, categoryParam) {
  if (!categoryParam) return true;
  const cat = categoryEngine.findTaxonomyCategory(categoryParam);
  if (!cat) return product.category === categoryParam;

  const ids = new Set([cat.id]);
  function collect(node) {
    if (node.children) {
      for (const c of node.children) {
        ids.add(c.id);
        collect(c);
      }
    }
  }
  collect(cat);
  return ids.has(product.category) || ids.has(product.subcategory);
}

function listProducts(query = {}) {
  if (!isStorefrontBridgeEnabled()) {
    return { items: [], total: 0, page: 1, pageSize: DEFAULT_PAGE_SIZE, totalPages: 0, facets: {} };
  }

  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(query.limit) || DEFAULT_PAGE_SIZE));
  const sort = query.sort || SORT_OPTIONS.RELEVANCE;
  const preview = query.preview === "1" || query.preview === true;
  const cacheKey = catalogCache.cacheKey([
    "catalog",
    "products",
    JSON.stringify({ ...query, preview }),
  ]);

  const cached = catalogCache.get(cacheKey);
  if (cached) return cached;

  let pimRows = loadVisiblePimProducts({ preview });
  const categoryId = resolveCategoryFilter(query.category);
  if (categoryId || query.category) {
    pimRows = pimRows.filter((p) => matchesCategory(p, query.category || categoryId));
  }

  if (query.q) {
    const q = String(query.q).toLowerCase();
    pimRows = pimRows.filter(
      (p) =>
        p.sku?.toLowerCase().includes(q) ||
        p.title?.toLowerCase().includes(q) ||
        p.ean?.toLowerCase().includes(q) ||
        p.gtin?.toLowerCase().includes(q) ||
        p.mpn?.toLowerCase().includes(q) ||
        p.brand?.name?.toLowerCase().includes(q)
    );
  }

  let mapped = pimRows.map(mapPimToStorefront).filter(Boolean);
  mapped = filterProducts(mapped, {
    brand: query.brand,
    minPrice: query.minPrice,
    maxPrice: query.maxPrice,
    inStock: query.inStock,
    availability: query.availability,
    sku: query.sku,
    gtin: query.gtin,
    mpn: query.mpn,
  });
  const facets = buildFilterFacets(mapped);
  mapped = sortProducts(mapped, sort);

  const total = mapped.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const offset = (page - 1) * pageSize;
  const items = mapped.slice(offset, offset + pageSize);

  const result = {
    items,
    total,
    page,
    pageSize,
    totalPages,
    facets,
    catalogMode: process.env.BUZZARD_SALES_ENABLED !== "1",
  };

  catalogCache.set(cacheKey, result);
  return result;
}

function getProductById(idOrSlug, { preview = false } = {}) {
  let product = productCore.getProduct(idOrSlug);
  if (!product) {
    const all = productCore.listProducts({ limit: 500 });
    product = all.find((p) => p.seo?.slug === idOrSlug);
  }
  if (!product || !isProductVisibleOnStorefront(product, { preview })) return null;
  return mapPimToStorefront(product);
}

function searchProducts(query = {}) {
  const storefrontSearchService = require("./storefrontSearchService");
  return storefrontSearchService.searchCatalog({ ...query, sort: query.sort || SORT_OPTIONS.RELEVANCE });
}

function listBrands() {
  const products = loadVisiblePimProducts();
  const brandIds = new Set(products.map((p) => p.brandId).filter(Boolean));
  return brandService
    .listBrands()
    .filter((b) => brandIds.has(b.id))
    .map((b) => ({ id: b.id, name: b.name, slug: b.slug }));
}

function getHealth() {
  const syncStatus = require("./syncStatus");
  return {
    enabled: isStorefrontBridgeEnabled(),
    salesEnabled: process.env.BUZZARD_SALES_ENABLED === "1",
    cache: catalogCache.stats(),
    sync: syncStatus.getSummary(),
    productCount: loadVisiblePimProducts().length,
  };
}

module.exports = {
  listProducts,
  getProductById,
  searchProducts,
  listBrands,
  getHealth,
  loadVisiblePimProducts,
};
