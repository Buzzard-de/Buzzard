/**
 * In-memory catalog search and sort. Does not query production sqlite.
 */
function normalize(value) {
  return String(value || "").toLowerCase();
}

function searchAndSort(records = [], { q = "", sort = "name", order = "asc" } = {}) {
  const term = normalize(q);
  const filtered = (Array.isArray(records) ? records : []).filter((row) => {
    if (!term) return true;
    const blob = [row.sku, row.title, row.name, row.brand, row.ean, row.mpn, row.categoryId]
      .map(normalize)
      .join(" ");
    return blob.includes(term);
  });
  const dir = order === "desc" ? -1 : 1;
  const sorted = [...filtered].sort((a, b) => {
    if (sort === "price") return (Number(a.price) - Number(b.price)) * dir;
    if (sort === "stock") return (Number(a.stock) - Number(b.stock)) * dir;
    const left = normalize(a.title || a.name || a.sku);
    const right = normalize(b.title || b.name || b.sku);
    return left.localeCompare(right) * dir;
  });
  return {
    ok: true,
    backend: "memory",
    liveIndex: false,
    total: sorted.length,
    items: sorted,
  };
}

module.exports = { searchAndSort };
