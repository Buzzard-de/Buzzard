/**
 * Catalog search over provided records, or the canonical storefront catalog.
 * Does not invent products or fitment.
 */

function loadCanonicalRows(query = {}) {
  try {
    const catalogReadService = require("../storefront/catalogReadService");
    const listed = catalogReadService.listProducts({
      q: query.q || undefined,
      page: 1,
      limit: 100,
    });
    return Array.isArray(listed.items) ? listed.items : [];
  } catch {
    return [];
  }
}

function searchCatalog(items, query = {}) {
  const q = String(query.q || "").trim().toLowerCase();
  const category = query.category || null;
  const locale = query.locale || "de";
  const usedCanonical = !Array.isArray(items);
  let rows = Array.isArray(items) ? items.slice() : loadCanonicalRows(query);

  if (category) {
    rows = rows.filter((item) => item.category === category || item.canonicalCategory === category);
  }
  if (q) {
    rows = rows.filter((item) => {
      const title = String(item.title || item.name || "").toLowerCase();
      const sku = String(item.sku || "").toLowerCase();
      return title.includes(q) || sku.includes(q);
    });
  }

  const sort = query.sort || "title";
  rows.sort((a, b) => String(a[sort] || a.title || "").localeCompare(String(b[sort] || b.title || ""), locale));

  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
  const page = Math.max(1, Number(query.page) || 1);
  const start = (page - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);

  return {
    ok: true,
    locale,
    query: q,
    category,
    total: rows.length,
    page,
    pageSize,
    empty: pageRows.length === 0,
    invalid: q.length > 200,
    items: pageRows,
    invented: false,
    fitmentClaimed: false,
    source: usedCanonical ? "catalogReadService" : "provided_rows",
  };
}

function searchCanonicalCatalog(query = {}) {
  return searchCatalog(undefined, query);
}

function getLocalSearchIndexStatus() {
  const { getSearchHealth } = require("../commerce/productSearchAbstraction");
  const health = getSearchHealth();
  return {
    mode: "local_catalog_filter",
    liveOpenSearch: false,
    opensearchDeployed: false,
    servingBackend: health.servingBackend,
    opensearchStubActive: health.opensearchStubActive,
    invented: false,
    fitmentClaimed: false,
    syncScript: "scripts/sync-search-index.mjs",
    syncScriptLiveClaim: false,
    note: "BUZZARD_OPENSEARCH_URL presence is not live OpenSearch.",
  };
}

module.exports = { searchCatalog, searchCanonicalCatalog, getLocalSearchIndexStatus };
