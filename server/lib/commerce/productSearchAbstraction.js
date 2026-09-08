/**
 * Part 8 — Product search abstraction → PRIMARY: searchIntelligence.js
 * @deprecated Direct SQL/advanced search — routes through ONE search engine.
 */
const searchIntelligence = require("../global/searchIntelligence");
const { loadSearchCatalog } = require("../global/globalCatalogSearch");
const catalogReadService = require("../storefront/catalogReadService");
const { mapPimToStorefront } = require("../storefront/publicProductMapper");

function getBackend() {
  return "searchIntelligence";
}

function searchProducts(query = {}) {
  const q = query.q || query.query || "";
  const catalog = loadSearchCatalog({ limit: query.limit || 1000 });
  const ranked = searchIntelligence.searchProducts(catalog, q, {
    country: query.country || "DE",
    language: query.language || "de",
    categoryId: query.category,
    vehicleId: query.vehicleId,
  });

  if (query.publicOnly) {
    const visible = catalogReadService.loadVisiblePimProducts();
    const visibleSkus = new Set(visible.map((p) => p.sku));
    ranked.results = ranked.results.filter((entry) => visibleSkus.has(entry.product.sku));
    ranked.resultCount = ranked.results.length;
  }

  const items = ranked.results.map((entry) => {
    const mapped = mapPimToStorefront(entry.product);
    return mapped ? { ...mapped, _searchScore: entry.score, _searchReasons: entry.reasons } : null;
  }).filter(Boolean);

  return {
    backend: "searchIntelligence",
    items,
    total: items.length,
    query: ranked.query,
    country: ranked.country,
    language: ranked.language,
  };
}

function getSearchHealth() {
  return {
    activeBackend: "searchIntelligence",
    primaryEngine: "server/lib/global/searchIntelligence.js",
    opensearchUrl: process.env.BUZZARD_OPENSEARCH_URL ? "configured" : "not_configured",
    opensearchEnabled: false,
    fallbackAvailable: true,
    deprecatedBackends: ["sql", "advancedSearch"],
  };
}

module.exports = {
  getBackend,
  searchProducts,
  getSearchHealth,
};
