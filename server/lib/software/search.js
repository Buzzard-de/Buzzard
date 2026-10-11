/**
 * Catalog search over provided records only. Does not invent products or fitment.
 */

function searchCatalog(items = [], query = {}) {
  const q = String(query.q || "").trim().toLowerCase();
  const category = query.category || null;
  const locale = query.locale || "de";
  let rows = Array.isArray(items) ? items.slice() : [];

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
  };
}

module.exports = { searchCatalog };
