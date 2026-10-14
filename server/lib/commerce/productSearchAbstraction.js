/**
 * Part 8 — Product search abstraction (current SQL → future OpenSearch)
 */
const pimProductSearch = require("../pim/productSearch");
const catalogReadService = require("../storefront/catalogReadService");

function getBackend() {
  if (process.env.BUZZARD_OPENSEARCH_URL && process.env.BUZZARD_OPENSEARCH_ENABLED === "1") {
    return "opensearch";
  }
  return "sql";
}

function searchProducts(query = {}) {
  const backend = getBackend();

  if (backend === "opensearch") {
    return searchOpenSearchStub(query);
  }

  if (query.publicOnly) {
    return catalogReadService.searchProducts(query);
  }

  const rows = pimProductSearch.search(query);
  return {
    backend: "sql",
    items: rows,
    total: rows.length,
  };
}

function searchOpenSearchStub(query) {
  const fallback = catalogReadService.searchProducts(query);
  return {
    backend: "opensearch_stub",
    opensearchConfigured: true,
    fallbackUsed: true,
    note: "OpenSearch adapter not deployed — using SQL/catalog fallback",
    ...fallback,
  };
}

function getSearchHealth() {
  const requested = getBackend();
  const stubActive = requested === "opensearch";
  return {
    activeBackend: requested,
    servingBackend: stubActive ? "sql_fallback" : "sql",
    liveOpenSearch: false,
    opensearchStubActive: stubActive,
    opensearchUrl: process.env.BUZZARD_OPENSEARCH_URL ? "configured" : "not_configured",
    opensearchEnabled: process.env.BUZZARD_OPENSEARCH_ENABLED === "1",
    fallbackAvailable: true,
    localIndex: "sql_or_catalog",
    invented: false,
  };
}

module.exports = {
  getBackend,
  searchProducts,
  getSearchHealth,
};
