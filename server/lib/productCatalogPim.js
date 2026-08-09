const { db } = require("./db");

function isEnabled() {
  return process.env.BUZZARD_PRODUCT_CATALOG_PIM !== "0" && process.env.BUZZARD_DB_ENABLED !== "0";
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function completeness(product) {
  let score = 0;
  if (product.sku) score += 10;
  if (product.barcode) score += 5;
  if (product.brand_id) score += 10;
  if (product.category_id) score += 10;
  if (product.selling_price > 0) score += 10;
  if (product.stock_qty >= 0) score += 5;

  const translation = db
    .prepare("SELECT * FROM pim30_product_translations WHERE product_id = ? AND language = 'de'")
    .get(product.id);
  if (translation?.title) score += 15;
  if (translation?.description) score += 10;
  if (translation?.meta_title) score += 5;

  if (db.prepare("SELECT id FROM pim30_product_media WHERE product_id = ? LIMIT 1").get(product.id)) {
    score += 10;
  }
  if (db.prepare("SELECT id FROM pim30_product_attributes WHERE product_id = ? LIMIT 1").get(product.id)) {
    score += 10;
  }

  return Math.min(100, score);
}

function updateCompleteness(productId) {
  const product = db.prepare("SELECT * FROM pim30_products WHERE id = ?").get(productId);
  if (!product) return 0;
  const score = completeness(product);
  db.prepare(`
    UPDATE pim30_products SET completeness = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(score, productId);
  return score;
}

function createBrand(body = {}) {
  if (!body.name) return { error: "Brand name required", status: 400 };
  const slug = slugify(body.slug || body.name);

  try {
    const result = db.prepare("INSERT INTO pim30_brands(name, slug) VALUES(?,?)").run(body.name, slug);
    return { brand: db.prepare("SELECT * FROM pim30_brands WHERE id = ?").get(result.lastInsertRowid), created: true };
  } catch {
    return { error: "Brand exists", status: 409 };
  }
}

function listBrands() {
  return db.prepare("SELECT * FROM pim30_brands WHERE status = 'active' ORDER BY name").all();
}

function createCategory(body = {}) {
  if (!body.name) return { error: "Category name required", status: 400 };

  const slug = slugify(body.slug || body.name);
  const parent = body.parentId || body.parent_id
    ? db.prepare("SELECT level FROM pim30_categories WHERE id = ?").get(body.parentId || body.parent_id)
    : null;

  const result = db
    .prepare(`
      INSERT INTO pim30_categories(parent_id, name, slug, level, sort_order)
      VALUES(?,?,?,?,?)
    `)
    .run(
      body.parentId || body.parent_id || null,
      body.name,
      slug,
      (parent?.level || 0) + 1,
      Number(body.sortOrder ?? body.sort_order ?? 0)
    );

  return {
    category: db.prepare("SELECT * FROM pim30_categories WHERE id = ?").get(result.lastInsertRowid),
    created: true,
  };
}

function listCategories() {
  return db
    .prepare("SELECT * FROM pim30_categories WHERE status = 'active' ORDER BY level, sort_order, name")
    .all();
}

function createProduct(body = {}) {
  if (!body.sku) return { error: "SKU required", status: 400 };

  try {
    const result = db
      .prepare(`
        INSERT INTO pim30_products(
          sku, parent_sku, barcode, brand_id, category_id, product_type, status, cost_price,
          selling_price, currency, tax_class, stock_qty, weight_kg, supplier_id, supplier_sku,
          supplier_feed_ref, tecdoc_ref
        )
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `)
      .run(
        body.sku,
        body.parentSku || body.parent_sku || "",
        body.barcode || "",
        body.brandId || body.brand_id || null,
        body.categoryId || body.category_id || null,
        body.productType || body.product_type || "simple",
        body.status || "draft",
        Number(body.costPrice ?? body.cost_price ?? 0),
        Number(body.sellingPrice ?? body.selling_price ?? 0),
        body.currency || "EUR",
        body.taxClass || body.tax_class || "standard",
        Number(body.stockQty ?? body.stock_qty ?? 0),
        Number(body.weightKg ?? body.weight_kg ?? 0),
        body.supplierId || body.supplier_id || "",
        body.supplierSku || body.supplier_sku || "",
        body.supplierFeedRef || body.supplier_feed_ref || "",
        body.tecdocRef || body.tecdoc_ref || ""
      );

    const product = db.prepare("SELECT * FROM pim30_products WHERE id = ?").get(result.lastInsertRowid);
    const score = updateCompleteness(product.id);
    return { product, completeness: score, created: true };
  } catch {
    return { error: "SKU already exists", status: 409 };
  }
}

function getProductBySku(sku) {
  const product = db
    .prepare(`
      SELECT p.*, b.name brand_name, c.name category_name
      FROM pim30_products p
      LEFT JOIN pim30_brands b ON b.id = p.brand_id
      LEFT JOIN pim30_categories c ON c.id = p.category_id
      WHERE p.sku = ?
    `)
    .get(sku);

  if (!product) return { error: "Product not found", status: 404 };

  return {
    product,
    translations: db
      .prepare("SELECT * FROM pim30_product_translations WHERE product_id = ?")
      .all(product.id),
    attributes: db.prepare("SELECT * FROM pim30_product_attributes WHERE product_id = ?").all(product.id),
    media: db
      .prepare("SELECT * FROM pim30_product_media WHERE product_id = ? ORDER BY sort_order")
      .all(product.id),
    variants: db
      .prepare("SELECT * FROM pim30_product_variants WHERE parent_product_id = ?")
      .all(product.id),
  };
}

function upsertTranslation(sku, language, body = {}) {
  const product = db.prepare("SELECT id FROM pim30_products WHERE sku = ?").get(sku);
  if (!product) return { error: "Product not found", status: 404 };

  db.prepare(`
    INSERT INTO pim30_product_translations(
      product_id, language, title, short_description, description, meta_title, meta_description, slug
    )
    VALUES(?,?,?,?,?,?,?,?)
    ON CONFLICT(product_id, language) DO UPDATE SET
      title = excluded.title,
      short_description = excluded.short_description,
      description = excluded.description,
      meta_title = excluded.meta_title,
      meta_description = excluded.meta_description,
      slug = excluded.slug
  `).run(
    product.id,
    language,
    body.title || "",
    body.shortDescription || body.short_description || "",
    body.description || "",
    body.metaTitle || body.meta_title || "",
    body.metaDescription || body.meta_description || "",
    body.slug || ""
  );

  updateCompleteness(product.id);
  return {
    translation: db
      .prepare("SELECT * FROM pim30_product_translations WHERE product_id = ? AND language = ?")
      .get(product.id, language),
  };
}

function upsertAttribute(sku, body = {}) {
  const product = db.prepare("SELECT id FROM pim30_products WHERE sku = ?").get(sku);
  if (!product) return { error: "Product not found", status: 404 };
  if (!body.code) return { error: "Attribute code required", status: 400 };

  db.prepare(`
    INSERT OR REPLACE INTO pim30_product_attributes(product_id, attribute_code, attribute_value, language)
    VALUES(?,?,?,?)
  `).run(product.id, body.code, String(body.value ?? ""), body.language || "");

  updateCompleteness(product.id);
  return { ok: true };
}

function addMedia(sku, body = {}) {
  const product = db.prepare("SELECT id FROM pim30_products WHERE sku = ?").get(sku);
  if (!product) return { error: "Product not found", status: 404 };

  const result = db
    .prepare(`
      INSERT INTO pim30_product_media(product_id, media_type, url, alt_text, sort_order)
      VALUES(?,?,?,?,?)
    `)
    .run(
      product.id,
      body.mediaType || body.media_type || "image",
      body.url || "",
      body.altText || body.alt_text || "",
      Number(body.sortOrder ?? body.sort_order ?? 0)
    );

  updateCompleteness(product.id);
  return {
    media: db.prepare("SELECT * FROM pim30_product_media WHERE id = ?").get(result.lastInsertRowid),
    created: true,
  };
}

function createVariant(sku, body = {}) {
  const product = db.prepare("SELECT id FROM pim30_products WHERE sku = ?").get(sku);
  if (!product) return { error: "Parent product not found", status: 404 };
  if (!body.sku) return { error: "Variant SKU required", status: 400 };

  try {
    const result = db
      .prepare(`
        INSERT INTO pim30_product_variants(
          parent_product_id, sku, barcode, option_json, selling_price, stock_qty
        )
        VALUES(?,?,?,?,?,?)
      `)
      .run(
        product.id,
        body.sku,
        body.barcode || "",
        JSON.stringify(body.options || {}),
        Number(body.sellingPrice ?? body.selling_price ?? 0),
        Number(body.stockQty ?? body.stock_qty ?? 0)
      );

    return {
      variant: db.prepare("SELECT * FROM pim30_product_variants WHERE id = ?").get(result.lastInsertRowid),
      created: true,
    };
  } catch {
    return { error: "Variant SKU exists", status: 409 };
  }
}

function listAdminProducts(query = {}) {
  const search = query.search || "";
  const status = query.status || "";
  const category = query.category || "";
  const brand = query.brand || "";

  let sql = `
    SELECT p.*, b.name brand_name, c.name category_name
    FROM pim30_products p
    LEFT JOIN pim30_brands b ON b.id = p.brand_id
    LEFT JOIN pim30_categories c ON c.id = p.category_id
    WHERE 1 = 1
  `;
  const args = [];

  if (search) {
    sql += " AND (p.sku LIKE ? OR p.barcode LIKE ? OR p.supplier_sku LIKE ?)";
    args.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (status) {
    sql += " AND p.status = ?";
    args.push(status);
  }
  if (category) {
    sql += " AND c.slug = ?";
    args.push(category);
  }
  if (brand) {
    sql += " AND b.slug = ?";
    args.push(brand);
  }

  sql += " ORDER BY p.id DESC LIMIT 500";
  return db.prepare(sql).all(...args);
}

function getProductCatalogPimOverview() {
  return {
    products: db.prepare("SELECT COUNT(*) n FROM pim30_products").get().n,
    active: db.prepare("SELECT COUNT(*) n FROM pim30_products WHERE status = 'active'").get().n,
    drafts: db.prepare("SELECT COUNT(*) n FROM pim30_products WHERE status = 'draft'").get().n,
    incomplete: db.prepare("SELECT COUNT(*) n FROM pim30_products WHERE completeness < 80").get().n,
    variants: db.prepare("SELECT COUNT(*) n FROM pim30_product_variants").get().n,
    brands: db.prepare("SELECT COUNT(*) n FROM pim30_brands").get().n,
    categories: db.prepare("SELECT COUNT(*) n FROM pim30_categories").get().n,
    translations: db.prepare("SELECT COUNT(*) n FROM pim30_product_translations").get().n,
  };
}

function getProductCatalogPimStatus() {
  const overview = getProductCatalogPimOverview();
  return {
    version: "3.0.0",
    enabled: isEnabled(),
    totals: {
      products: overview.products,
      active: overview.active,
      drafts: overview.drafts,
      incomplete: overview.incomplete,
      variants: overview.variants,
      brands: overview.brands,
      categories: overview.categories,
      translations: overview.translations,
    },
    overview,
  };
}

module.exports = {
  isEnabled,
  completeness,
  updateCompleteness,
  createBrand,
  listBrands,
  createCategory,
  listCategories,
  createProduct,
  getProductBySku,
  upsertTranslation,
  upsertAttribute,
  addMedia,
  createVariant,
  listAdminProducts,
  getProductCatalogPimOverview,
  getProductCatalogPimStatus,
};
