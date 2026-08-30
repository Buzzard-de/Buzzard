/**
 * Part 18 — Enhanced storefront search (reuses PIM catalog + visibility rules).
 * Never returns demo, hidden, or blocked products.
 */
const catalogReadService = require("./catalogReadService");
const { mapPimToStorefront } = require("./publicProductMapper");
const { isProductVisibleOnStorefront } = require("./storefrontVisibility");
const { sortProducts, filterProducts, buildFilterFacets } = require("./filterSort");
const { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, SORT_OPTIONS } = require("../../core/storefrontConstants");
const productCore = require("../pim/productCore");
const categoryEngine = require("../pim/categoryEngine");

const SEARCH_FIELDS = Object.freeze([
  "sku",
  "gtin",
  "ean",
  "mpn",
  "brand",
  "title",
  "category",
  "availability",
  "price",
  "vehicleCompatibility",
]);

function normalizeAvailability(value) {
  if (!value) return null;
  const v = String(value).toLowerCase();
  if (["in_stock", "instock", "1", "true"].includes(v)) return "in_stock";
  if (["out_of_stock", "outofstock", "0", "false"].includes(v)) return "out_of_stock";
  if (["low_stock", "low"].includes(v)) return "low_stock";
  return v;
}

function productMatchesQuery(mapped, q) {
  if (!q) return true;
  const needle = String(q).toLowerCase();
  const haystack = [
    mapped.sku,
    mapped.gtin,
    mapped.ean,
    mapped.mpn,
    mapped.title,
    mapped.brand?.name,
    mapped.brand?.slug,
    mapped.categorySlug,
    mapped.categoryId,
    mapped.attributes?.vehicleCompatibility,
    mapped.attributes?.fitment,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}

function resolveCategoryIds(categoryParam) {
  if (!categoryParam) return null;
  const cat = categoryEngine.findTaxonomyCategory(categoryParam);
  if (!cat) return new Set([categoryParam]);
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
  return ids;
}

function matchesCategory(product, categoryParam) {
  if (!categoryParam) return true;
  const ids = resolveCategoryIds(categoryParam);
  if (!ids) return product.category === categoryParam;
  return ids.has(product.category) || ids.has(product.subcategory);
}

function searchCatalog(query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(query.limit) || DEFAULT_PAGE_SIZE));
  const sort = query.sort || SORT_OPTIONS.RELEVANCE;
  const preview = query.preview === "1" || query.preview === true;

  let pimRows = productCore.listProducts({ limit: 1000 }).filter((p) => isProductVisibleOnStorefront(p, { preview }));

  if (query.category) {
    pimRows = pimRows.filter((p) => matchesCategory(p, query.category));
  }

  let mapped = pimRows.map(mapPimToStorefront).filter(Boolean);

  if (query.q) {
    mapped = mapped.filter((p) => productMatchesQuery(p, query.q));
  }

  mapped = filterProducts(mapped, {
    brand: query.brand,
    minPrice: query.minPrice,
    maxPrice: query.maxPrice,
    inStock: query.inStock,
    availability: query.availability,
    mpn: query.mpn,
    gtin: query.gtin,
    sku: query.sku,
  });

  const facets = buildFilterFacets(mapped);
  mapped = sortProducts(mapped, sort);

  const total = mapped.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const offset = (page - 1) * pageSize;
  const items = mapped.slice(offset, offset + pageSize);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
    facets,
    searchFields: SEARCH_FIELDS,
    catalogMode: process.env.BUZZARD_SALES_ENABLED !== "1",
    blockedExcluded: true,
    demoExcluded: true,
  };
}

function getSearchReadiness() {
  const visible = catalogReadService.loadVisiblePimProducts();
  return {
    enabled: true,
    supportedFields: SEARCH_FIELDS,
    publicProductCount: visible.length,
    pagination: { defaultPageSize: DEFAULT_PAGE_SIZE, maxPageSize: MAX_PAGE_SIZE },
    demoExcluded: true,
    hiddenExcluded: true,
    blockedExcluded: true,
  };
}

module.exports = {
  SEARCH_FIELDS,
  searchCatalog,
  getSearchReadiness,
  normalizeAvailability,
};
