const { db } = require("./db");
const fs = require("fs");
const path = require("path");

let skuSlugIndex = null;

function getSkuSlugIndex() {
  if (skuSlugIndex) return skuSlugIndex;
  skuSlugIndex = new Map();
  try {
    const productsFile = path.join(__dirname, "..", "..", "data", "buzzard_products.json");
    const raw = JSON.parse(fs.readFileSync(productsFile, "utf8"));
    for (const product of raw.products || []) {
      if (product.status !== "active") continue;
      const slug = product.seo?.slug;
      if (!slug) continue;
      if (product.sku) skuSlugIndex.set(product.sku, slug);
      for (const variant of product.variants || []) {
        if (variant.sku) skuSlugIndex.set(variant.sku, slug);
      }
    }
  } catch {
    /* catalog optional at runtime */
  }
  return skuSlugIndex;
}

function isEnabled() {
  return process.env.BUZZARD_ADVANCED_SEARCH !== "0" && process.env.BUZZARD_DB_ENABLED !== "0";
}

function normalizeQuery(query) {
  let normalized = String(query || "")
    .toLowerCase()
    .trim();
  const rows = db.prepare("SELECT term, synonyms_json FROM srch_synonyms WHERE active = 1").all();

  for (const row of rows) {
    const synonyms = JSON.parse(row.synonyms_json || "[]");
    for (const value of [row.term, ...synonyms]) {
      const synonym = String(value).toLowerCase();
      if (normalized.includes(synonym) && synonym !== row.term.toLowerCase()) {
        normalized = normalized.replaceAll(synonym, row.term.toLowerCase());
      }
    }
  }

  return normalized.replace(/\s+/g, " ");
}

function searchProducts(query) {
  const pattern = `%${query}%`;
  return db
    .prepare(`
      SELECT *
      FROM srch_products
      WHERE active = 1
        AND (
          title LIKE ? OR description LIKE ? OR brand LIKE ? OR category LIKE ?
          OR subcategory LIKE ? OR tags LIKE ? OR attributes_json LIKE ?
        )
    `)
    .all(pattern, pattern, pattern, pattern, pattern, pattern, pattern);
}

function rankProducts(rows, query, sort) {
  const terms = query.split(" ").filter(Boolean);

  const ranked = rows.map((product) => {
    let score = 0;
    const text = `${product.title} ${product.brand} ${product.category} ${product.subcategory} ${product.tags}`.toLowerCase();

    for (const term of terms) {
      if (product.title.toLowerCase().includes(term)) score += 20;
      if (text.includes(term)) score += 5;
    }

    score += product.rating * 2 + Math.min(product.review_count / 50, 5) + (product.stock > 0 ? 4 : 0);
    return { ...product, rank_score: score };
  });

  return ranked.sort((a, b) => {
    if (sort === "price_asc") return a.price - b.price;
    if (sort === "price_desc") return b.price - a.price;
    if (sort === "rating") return b.rating - a.rating;
    return b.rank_score - a.rank_score;
  });
}

function suggest(query) {
  const term = String(query || "")
    .trim()
    .toLowerCase();
  if (!term) return { suggestions: [] };

  const products = db
    .prepare(`
      SELECT title, brand, sku
      FROM srch_products
      WHERE active = 1 AND (title LIKE ? OR brand LIKE ?)
      ORDER BY rating DESC
      LIMIT 8
    `)
    .all(`%${term}%`, `%${term}%`);

  const synonyms = db
    .prepare("SELECT term FROM srch_synonyms WHERE term LIKE ? LIMIT 5")
    .all(`${term}%`);

  return {
    suggestions: [
      ...products.map((row) => ({
        type: "product",
        text: row.title,
        sku: row.sku,
        slug: getSkuSlugIndex().get(row.sku) || null,
      })),
      ...synonyms.map((row) => ({ type: "keyword", text: row.term })),
    ],
  };
}

function search(queryParams = {}) {
  const raw = String(queryParams.q || "");
  const normalized = normalizeQuery(raw);
  const category = queryParams.category || "";
  const brand = queryParams.brand || "";
  const min = queryParams.minPrice == null ? null : Number(queryParams.minPrice);
  const max = queryParams.maxPrice == null ? null : Number(queryParams.maxPrice);
  const rating = queryParams.rating == null ? null : Number(queryParams.rating);
  const sort = queryParams.sort || "relevance";
  const page = Math.max(1, Number(queryParams.page || 1));
  const size = Math.min(100, Math.max(1, Number(queryParams.size || 24)));

  let rows = searchProducts(normalized);
  if (category) rows = rows.filter((row) => row.category.toLowerCase() === category.toLowerCase());
  if (brand) rows = rows.filter((row) => row.brand.toLowerCase() === brand.toLowerCase());
  if (min != null) rows = rows.filter((row) => row.price >= min);
  if (max != null) rows = rows.filter((row) => row.price <= max);
  if (rating != null) rows = rows.filter((row) => row.rating >= rating);

  rows = rankProducts(rows, normalized, sort);
  const total = rows.length;
  const results = rows.slice((page - 1) * size, page * size);

  db.prepare(`
    INSERT INTO srch_events(query, normalized_query, customer_id, result_count)
    VALUES(?,?,?,?)
  `).run(raw, normalized, queryParams.customerId || queryParams.customer_id || null, total);

  return {
    query: raw,
    normalizedQuery: normalized,
    total,
    page,
    size,
    totalPages: Math.ceil(total / size),
    results,
    filters: { category, brand, minPrice: min, maxPrice: max, rating, sort },
  };
}

function recordClick(sku) {
  const product = db.prepare("SELECT sku FROM srch_products WHERE sku = ?").get(sku);
  if (!product) return { error: "Product not found", status: 404 };

  db.prepare(`
    UPDATE srch_events
    SET clicked_sku = ?
    WHERE id = (SELECT id FROM srch_events ORDER BY id DESC LIMIT 1)
  `).run(product.sku);

  return { ok: true };
}

function createProduct(body = {}) {
  if (!body.sku || !body.title) {
    return { error: "SKU and title required", status: 400 };
  }

  try {
    const result = db
      .prepare(`
        INSERT INTO srch_products(
          sku, title, description, category, subcategory, brand, price, currency,
          rating, review_count, stock, tags, attributes_json
        )
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)
      `)
      .run(
        body.sku,
        body.title,
        body.description || "",
        body.category || "",
        body.subcategory || "",
        body.brand || "",
        Number(body.price || 0),
        body.currency || "EUR",
        Number(body.rating || 0),
        Number(body.reviewCount ?? body.review_count ?? 0),
        Number(body.stock || 0),
        body.tags || "",
        JSON.stringify(body.attributes || {})
      );

    return {
      product: db.prepare("SELECT * FROM srch_products WHERE id = ?").get(result.lastInsertRowid),
      created: true,
    };
  } catch {
    return { error: "SKU already exists", status: 409 };
  }
}

function upsertSynonym(body = {}) {
  if (!body.term) return { error: "Term required", status: 400 };

  db.prepare(`
    INSERT OR REPLACE INTO srch_synonyms(term, synonyms_json, active)
    VALUES(?,?,1)
  `).run(String(body.term).toLowerCase(), JSON.stringify(body.synonyms || []));

  return { ok: true };
}

function getSearchOverview() {
  return {
    products: db.prepare("SELECT COUNT(*) n FROM srch_products WHERE active = 1").get().n,
    searches: db.prepare("SELECT COUNT(*) n FROM srch_events").get().n,
    zeroResults: db.prepare("SELECT COUNT(*) n FROM srch_events WHERE result_count = 0").get().n,
    clicks: db.prepare("SELECT COUNT(*) n FROM srch_events WHERE clicked_sku <> ''").get().n,
    synonyms: db.prepare("SELECT COUNT(*) n FROM srch_synonyms WHERE active = 1").get().n,
    topQueries: db
      .prepare(`
        SELECT normalized_query, COUNT(*) n
        FROM srch_events
        WHERE normalized_query <> ''
        GROUP BY normalized_query
        ORDER BY n DESC
        LIMIT 10
      `)
      .all(),
  };
}

function getZeroResultQueries() {
  return db
    .prepare(`
      SELECT normalized_query, COUNT(*) n
      FROM srch_events
      WHERE result_count = 0
      GROUP BY normalized_query
      ORDER BY n DESC
      LIMIT 50
    `)
    .all();
}

function getAdvancedSearchStatus() {
  const overview = getSearchOverview();
  return {
    version: "2.9.0",
    enabled: isEnabled(),
    totals: {
      products: overview.products,
      searches: overview.searches,
      zeroResults: overview.zeroResults,
      clicks: overview.clicks,
      synonyms: overview.synonyms,
      topQueries: overview.topQueries.length,
    },
    overview,
  };
}

module.exports = {
  isEnabled,
  normalizeQuery,
  suggest,
  search,
  recordClick,
  createProduct,
  upsertSynonym,
  getSearchOverview,
  getZeroResultQueries,
  getAdvancedSearchStatus,
};
