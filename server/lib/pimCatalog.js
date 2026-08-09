const { db } = require("./db");

function isEnabled() {
  return process.env.BUZZARD_PIM_CATALOG !== "0" && process.env.BUZZARD_DB_ENABLED !== "0";
}

function updateCompleteness(productId) {
  const product = db.prepare("SELECT * FROM pim_products WHERE id = ?").get(productId);
  if (!product) return 0;

  const translations = db
    .prepare(
      "SELECT COUNT(*) n FROM pim_product_translations WHERE product_id = ? AND title <> '' AND description <> ''"
    )
    .get(productId).n;
  const attributes = db
    .prepare("SELECT COUNT(*) n FROM pim_product_attributes WHERE product_id = ?")
    .get(productId).n;
  const media = db.prepare("SELECT COUNT(*) n FROM pim_product_media WHERE product_id = ?").get(productId).n;
  const seo = db
    .prepare(
      "SELECT COUNT(*) n FROM pim_product_seo WHERE product_id = ? AND meta_title <> '' AND meta_description <> ''"
    )
    .get(productId).n;

  let score = 0;
  if (product.sku) score += 10;
  if (product.ean || product.gtin) score += 10;
  if (product.brand_id) score += 10;
  if (product.category_id) score += 10;
  if (product.price > 0) score += 10;
  if (translations > 0) score += 20;
  if (attributes > 0) score += 10;
  if (media > 0) score += 10;
  if (seo > 0) score += 10;

  db.prepare(
    "UPDATE pim_products SET completeness = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).run(score, productId);
  return score;
}

function listCategories() {
  return db.prepare("SELECT * FROM pim_categories WHERE active = 1 ORDER BY name").all();
}

function listBrands() {
  return db.prepare("SELECT * FROM pim_brands WHERE active = 1 ORDER BY name").all();
}

function listProducts(filters = {}) {
  const search = String(filters.search || "").trim();
  const status = String(filters.status || "").trim();
  let sql = `
    SELECT p.*, b.name AS brand, c.name AS category
    FROM pim_products p
    LEFT JOIN pim_brands b ON b.id = p.brand_id
    LEFT JOIN pim_categories c ON c.id = p.category_id
    WHERE 1 = 1
  `;
  const args = [];
  if (search) {
    sql += " AND (p.sku LIKE ? OR p.ean LIKE ? OR b.name LIKE ? OR c.name LIKE ?)";
    args.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (status) {
    sql += " AND p.status = ?";
    args.push(status);
  }
  sql += " ORDER BY p.updated_at DESC";
  return db.prepare(sql).all(...args);
}

function getProductBySku(sku) {
  const product = db
    .prepare(`
      SELECT p.*, b.name AS brand, c.name AS category
      FROM pim_products p
      LEFT JOIN pim_brands b ON b.id = p.brand_id
      LEFT JOIN pim_categories c ON c.id = p.category_id
      WHERE p.sku = ?
    `)
    .get(sku);
  if (!product) return { error: "Product not found", status: 404 };
  return {
    product,
    translations: db
      .prepare("SELECT * FROM pim_product_translations WHERE product_id = ?")
      .all(product.id),
    attributes: db.prepare("SELECT * FROM pim_product_attributes WHERE product_id = ?").all(product.id),
    variants: db.prepare("SELECT * FROM pim_product_variants WHERE product_id = ?").all(product.id),
    media: db
      .prepare("SELECT * FROM pim_product_media WHERE product_id = ? ORDER BY sort_order")
      .all(product.id),
    seo: db.prepare("SELECT * FROM pim_product_seo WHERE product_id = ?").get(product.id) || null,
  };
}

function createProduct(body = {}) {
  const sku = String(body.sku || "").trim();
  if (!sku) return { error: "sku required", status: 400 };
  try {
    const result = db
      .prepare(`
        INSERT INTO pim_products(sku, brand_id, category_id, ean, gtin, status, price, cost, weight_kg, stock)
        VALUES(?,?,?,?,?,?,?,?,?,?)
      `)
      .run(
        sku,
        body.brandId || body.brand_id || null,
        body.categoryId || body.category_id || null,
        body.ean || "",
        body.gtin || "",
        body.status || "draft",
        Number(body.price || 0),
        Number(body.cost || 0),
        Number(body.weightKg || body.weight_kg || 0),
        Number(body.stock || 0)
      );
    const score = updateCompleteness(result.lastInsertRowid);
    const product = db.prepare("SELECT * FROM pim_products WHERE id = ?").get(result.lastInsertRowid);
    return { product: { ...product, completeness: score } };
  } catch {
    return { error: "SKU already exists", status: 409 };
  }
}

function updateProduct(id, body = {}) {
  const product = db.prepare("SELECT * FROM pim_products WHERE id = ?").get(id);
  if (!product) return { error: "Product not found", status: 404 };
  db.prepare(`
    UPDATE pim_products
    SET brand_id = ?, category_id = ?, ean = ?, gtin = ?, status = ?, price = ?, cost = ?, weight_kg = ?, stock = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    body.brandId ?? body.brand_id ?? product.brand_id,
    body.categoryId ?? body.category_id ?? product.category_id,
    body.ean ?? product.ean,
    body.gtin ?? product.gtin,
    body.status ?? product.status,
    body.price ?? product.price,
    body.cost ?? product.cost,
    body.weightKg ?? body.weight_kg ?? product.weight_kg,
    body.stock ?? product.stock,
    product.id
  );
  const score = updateCompleteness(product.id);
  const updated = db.prepare("SELECT * FROM pim_products WHERE id = ?").get(product.id);
  return { product: { ...updated, completeness: score } };
}

function upsertTranslation(body = {}) {
  const productId = Number(body.productId || body.product_id);
  if (!productId) return { error: "productId required", status: 400 };
  db.prepare(`
    INSERT INTO pim_product_translations(product_id, language, title, short_description, description)
    VALUES(?,?,?,?,?)
    ON CONFLICT(product_id, language) DO UPDATE SET
      title = excluded.title,
      short_description = excluded.short_description,
      description = excluded.description
  `).run(
    productId,
    body.language,
    body.title || "",
    body.shortDescription || body.short_description || "",
    body.description || ""
  );
  updateCompleteness(productId);
  return { ok: true };
}

function upsertAttribute(body = {}) {
  const productId = Number(body.productId || body.product_id);
  if (!productId || !body.key) return { error: "productId and key required", status: 400 };
  db.prepare(`
    INSERT INTO pim_product_attributes(product_id, attribute_key, attribute_value, unit)
    VALUES(?,?,?,?)
    ON CONFLICT(product_id, attribute_key) DO UPDATE SET
      attribute_value = excluded.attribute_value,
      unit = excluded.unit
  `).run(productId, body.key, body.value || "", body.unit || "");
  updateCompleteness(productId);
  return { ok: true };
}

function addMedia(body = {}) {
  const productId = Number(body.productId || body.product_id);
  if (!productId || !body.url) return { error: "productId and url required", status: 400 };
  db.prepare(
    "INSERT INTO pim_product_media(product_id, media_type, url, alt_text, sort_order) VALUES(?,?,?,?,?)"
  ).run(
    productId,
    body.mediaType || body.media_type || "image",
    body.url,
    body.altText || body.alt_text || "",
    Number(body.sortOrder || body.sort_order || 0)
  );
  updateCompleteness(productId);
  return { ok: true };
}

function upsertSeo(body = {}) {
  const productId = Number(body.productId || body.product_id);
  if (!productId) return { error: "productId required", status: 400 };
  db.prepare(`
    INSERT INTO pim_product_seo(product_id, meta_title, meta_description, slug)
    VALUES(?,?,?,?)
    ON CONFLICT(product_id) DO UPDATE SET
      meta_title = excluded.meta_title,
      meta_description = excluded.meta_description,
      slug = excluded.slug
  `).run(productId, body.metaTitle || body.meta_title || "", body.metaDescription || body.meta_description || "", body.slug || "");
  updateCompleteness(productId);
  return { ok: true };
}

function addVariant(body = {}) {
  const productId = Number(body.productId || body.product_id);
  const variantSku = String(body.variantSku || body.variant_sku || "").trim();
  if (!productId || !variantSku) return { error: "productId and variantSku required", status: 400 };
  db.prepare(`
    INSERT INTO pim_product_variants(product_id, variant_sku, option_name, option_value, ean, price_delta, stock)
    VALUES(?,?,?,?,?,?,?)
  `).run(
    productId,
    variantSku,
    body.optionName || body.option_name || "",
    body.optionValue || body.option_value || "",
    body.ean || "",
    Number(body.priceDelta || body.price_delta || 0),
    Number(body.stock || 0)
  );
  return { ok: true };
}

function getCompletenessStats() {
  const total = db.prepare("SELECT COUNT(*) n FROM pim_products").get().n;
  const published = db.prepare("SELECT COUNT(*) n FROM pim_products WHERE status = 'published'").get().n;
  const avg = db.prepare("SELECT COALESCE(AVG(completeness), 0) n FROM pim_products").get().n;
  const readyForFeed = db
    .prepare("SELECT COUNT(*) n FROM pim_products WHERE completeness >= 80 AND status = 'published'")
    .get().n;
  return {
    total,
    published,
    averageCompleteness: Number(Number(avg).toFixed(1)),
    readyForFeed,
  };
}

function queueImport(body = {}) {
  const result = db
    .prepare("INSERT INTO pim_catalog_import_jobs(source_type, source_name, items_total) VALUES(?,?,?)")
    .run(body.sourceType || body.source_type || "xml", body.sourceName || body.source_name || "supplier-feed", Number(body.itemsTotal || body.items_total || 0));
  const job = db.prepare("SELECT * FROM pim_catalog_import_jobs WHERE id = ?").get(result.lastInsertRowid);
  return { job, status: 202 };
}

function listImportJobs() {
  return db.prepare("SELECT * FROM pim_catalog_import_jobs ORDER BY id DESC").all();
}

function getFeed() {
  const products = db
    .prepare(`
      SELECT p.sku, p.ean, p.gtin, p.price, p.stock, p.status, b.name AS brand, c.name AS category,
             t.title, t.description, s.slug
      FROM pim_products p
      LEFT JOIN pim_brands b ON b.id = p.brand_id
      LEFT JOIN pim_categories c ON c.id = p.category_id
      LEFT JOIN pim_product_translations t ON t.product_id = p.id AND t.language = 'de-DE'
      LEFT JOIN pim_product_seo s ON s.product_id = p.id
      WHERE p.status = 'published' AND p.completeness >= 80
    `)
    .all();
  return { generatedAt: new Date().toISOString(), products };
}

function getPimCatalogStatus() {
  return {
    version: "1.9.0",
    enabled: isEnabled(),
    totals: {
      categories: db.prepare("SELECT COUNT(*) n FROM pim_categories WHERE active = 1").get().n,
      brands: db.prepare("SELECT COUNT(*) n FROM pim_brands WHERE active = 1").get().n,
      products: db.prepare("SELECT COUNT(*) n FROM pim_products").get().n,
      published: db.prepare("SELECT COUNT(*) n FROM pim_products WHERE status = 'published'").get().n,
      readyForFeed: db
        .prepare("SELECT COUNT(*) n FROM pim_products WHERE completeness >= 80 AND status = 'published'")
        .get().n,
      importJobs: db.prepare("SELECT COUNT(*) n FROM pim_catalog_import_jobs").get().n,
      variants: db.prepare("SELECT COUNT(*) n FROM pim_product_variants").get().n,
    },
    completeness: getCompletenessStats(),
  };
}

module.exports = {
  isEnabled,
  listCategories,
  listBrands,
  listProducts,
  getProductBySku,
  createProduct,
  updateProduct,
  upsertTranslation,
  upsertAttribute,
  addMedia,
  upsertSeo,
  addVariant,
  getCompletenessStats,
  queueImport,
  listImportJobs,
  getFeed,
  getPimCatalogStatus,
};
