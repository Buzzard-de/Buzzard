const { db } = require("../db");

function searchProducts({ q, category, brandId, limit = 50, offset = 0 }) {
  const term = String(q || "").trim();
  if (!term && !category && !brandId) {
    return db.prepare("SELECT id FROM pim_core_products ORDER BY updated_at DESC LIMIT ? OFFSET ?").all(limit, offset);
  }

  let sql = `
    SELECT p.id FROM pim_core_products p
    LEFT JOIN pim_core_brands b ON b.id = p.brand_id
    WHERE 1=1
  `;
  const params = [];

  if (term) {
    sql += ` AND (
      p.sku LIKE ? OR p.ean LIKE ? OR p.gtin LIKE ? OR p.mpn LIKE ?
      OR p.title LIKE ? OR b.name LIKE ? OR p.taxonomy_category_id LIKE ?
    )`;
    const like = `%${term}%`;
    params.push(like, like, like, like, like, like, like);
  }
  if (category) {
    sql += " AND p.taxonomy_category_id = ?";
    params.push(category);
  }
  if (brandId) {
    sql += " AND p.brand_id = ?";
    params.push(brandId);
  }
  sql += " ORDER BY p.updated_at DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);

  return db.prepare(sql).all(...params);
}

function search(query, opts = {}) {
  const ids = searchProducts({ q: query.q, category: query.category, brandId: query.brandId, limit: opts.limit, offset: opts.offset });
  const productCore = require("./productCore");
  return ids.map((r) => productCore.getProduct(r.id)).filter(Boolean);
}

module.exports = { search, searchProducts };
