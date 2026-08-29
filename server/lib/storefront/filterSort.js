/**
 * Part 7 — Sort & filter helpers for storefront catalog
 */
const { SORT_OPTIONS } = require("../../core/storefrontConstants");

function sortProducts(items, sort) {
  const list = [...items];
  switch (sort) {
    case SORT_OPTIONS.PRICE_ASC:
      return list.sort((a, b) => a.price - b.price);
    case SORT_OPTIONS.PRICE_DESC:
      return list.sort((a, b) => b.price - a.price);
    case SORT_OPTIONS.NEWEST:
      return list.sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
    case SORT_OPTIONS.NAME:
      return list.sort((a, b) => String(a.title).localeCompare(String(b.title)));
    case SORT_OPTIONS.RELEVANCE:
    default:
      return list;
  }
}

function filterProducts(items, filters = {}) {
  let result = items;

  if (filters.brand) {
    const brand = String(filters.brand).toLowerCase();
    result = result.filter(
      (p) => p.brand?.slug?.toLowerCase() === brand || p.brand?.name?.toLowerCase() === brand
    );
  }

  if (filters.minPrice != null) {
    const min = Number(filters.minPrice);
    if (Number.isFinite(min)) result = result.filter((p) => p.price >= min);
  }

  if (filters.maxPrice != null) {
    const max = Number(filters.maxPrice);
    if (Number.isFinite(max)) result = result.filter((p) => p.price <= max);
  }

  if (filters.inStock === "1" || filters.inStock === true) {
    result = result.filter((p) => p.stock > 0);
  }

  if (filters.attributes && typeof filters.attributes === "object") {
    for (const [key, val] of Object.entries(filters.attributes)) {
      result = result.filter((p) => String(p.attributes?.[key] || "") === String(val));
    }
  }

  return result;
}

function buildFilterFacets(items) {
  const brands = new Map();
  let minPrice = Infinity;
  let maxPrice = 0;
  let inStockCount = 0;

  for (const p of items) {
    if (p.brand?.name) {
      brands.set(p.brand.slug || p.brand.name, p.brand.name);
    }
    if (p.price < minPrice) minPrice = p.price;
    if (p.price > maxPrice) maxPrice = p.price;
    if (p.stock > 0) inStockCount += 1;
  }

  return {
    brands: [...brands.entries()].map(([slug, name]) => ({ slug, name })),
    priceRange: {
      min: Number.isFinite(minPrice) ? minPrice : 0,
      max: maxPrice,
    },
    inStockCount,
  };
}

module.exports = { sortProducts, filterProducts, buildFilterFacets, SORT_OPTIONS };
