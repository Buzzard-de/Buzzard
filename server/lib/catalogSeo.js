const { db } = require("./db");

function isEnabled() {
  return process.env.BUZZARD_CATALOG_SEO !== "0" && process.env.BUZZARD_DB_ENABLED !== "0";
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9äöüß\s-]/gi, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function roundMoney(value) {
  return Number(Number(value).toFixed(2));
}

function autoPrice(cost, marginFloor = Number(process.env.MIN_MARGIN || 0.12)) {
  const target = Math.max(marginFloor, Number(process.env.DEFAULT_MARGIN || 0.3));
  const safeCost = Number(cost) || 0;
  if (safeCost <= 0) return 0;
  return roundMoney(safeCost / (1 - target));
}

function audit(productId, action, details) {
  db.prepare("INSERT INTO product_audit(product_id, action, details) VALUES(?,?,?)").run(
    productId,
    action,
    JSON.stringify(details || {})
  );
}

function mapProduct(row) {
  if (!row) return row;
  return {
    ...row,
    active: Boolean(row.active),
  };
}

function listCategories() {
  return db.prepare("SELECT * FROM categories WHERE active = 1 ORDER BY name").all();
}

function listProducts(filters = {}) {
  let sql = `
    SELECT p.*, c.name category, c.slug category_slug
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
  `;
  const args = [];
  if (filters.vehicleId) {
    sql += `
      INNER JOIN compatibility comp ON comp.product_sku = p.sku AND comp.vehicle_id = ?
    `;
    args.push(Number(filters.vehicleId));
  }
  sql += " WHERE p.active = 1";
  if (filters.q) {
    sql += " AND (p.name LIKE ? OR p.sku LIKE ? OR p.description LIKE ?)";
    args.push(`%${filters.q}%`, `%${filters.q}%`, `%${filters.q}%`);
  }
  if (filters.category) {
    sql += " AND c.slug = ?";
    args.push(filters.category);
  }
  if (filters.minPrice != null && filters.minPrice !== "") {
    sql += " AND p.price_eur >= ?";
    args.push(Number(filters.minPrice));
  }
  if (filters.maxPrice != null && filters.maxPrice !== "") {
    sql += " AND p.price_eur <= ?";
    args.push(Number(filters.maxPrice));
  }
  sql += " ORDER BY p.updated_at DESC, p.id DESC";
  return db.prepare(sql).all(...args).map(mapProduct);
}

function getProductBySlug(slug) {
  const product = db
    .prepare(`
      SELECT p.*, c.name category, c.slug category_slug
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.slug = ? AND p.active = 1
    `)
    .get(slug);
  if (!product) return null;
  const images = db
    .prepare("SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order, id")
    .all(product.id);
  return { ...mapProduct(product), images };
}

function getProductJsonLd(id) {
  const product = db
    .prepare(`
      SELECT p.*, c.name category
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.id = ? AND p.active = 1
    `)
    .get(id);
  if (!product) return null;
  const base = (process.env.PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://buzzard24.de").replace(
    /\/$/,
    ""
  );
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.sku,
    description: product.description,
    category: product.category,
    url: `${base}/produkt/${product.slug}/`,
    offers: {
      "@type": "Offer",
      priceCurrency: "EUR",
      price: product.price_eur,
      availability:
        product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };
}

function listAdminProducts() {
  return db
    .prepare(`
      SELECT p.*, c.name category
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      ORDER BY p.id DESC
    `)
    .all()
    .map(mapProduct);
}

function createCategory(body = {}) {
  const { name } = body;
  if (!name) return { error: "name required", status: 400 };
  try {
    const slug = slugify(name);
    const result = db.prepare("INSERT INTO categories(name, slug) VALUES(?, ?)").run(name, slug);
    return { category: db.prepare("SELECT * FROM categories WHERE id = ?").get(result.lastInsertRowid) };
  } catch {
    return { error: "Category already exists", status: 409 };
  }
}

function createProduct(body = {}) {
  const {
    sku,
    name,
    description = "",
    categoryId,
    supplierCostEur = 0,
    priceEur,
    marginFloor = Number(process.env.MIN_MARGIN || 0.12),
    stock = 0,
    imageUrl = "",
    seoTitle,
    seoDescription,
    slug,
  } = body;
  if (!sku || !name) return { error: "sku and name required", status: 400 };
  const cost = Number(supplierCostEur) || 0;
  const floor = Number(marginFloor);
  const price = priceEur != null && priceEur !== "" ? Number(priceEur) : autoPrice(cost, floor);
  const productSlug = slugify(slug || name);
  try {
    const result = db
      .prepare(`
        INSERT INTO products
        (sku, name, slug, description, category_id, supplier_cost_eur, price_eur, margin_floor, stock, image_url, seo_title, seo_description)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?)
      `)
      .run(
        sku,
        name,
        productSlug,
        description,
        categoryId || null,
        cost,
        price,
        floor,
        Number(stock) || 0,
        imageUrl,
        seoTitle || name,
        seoDescription || description || name
      );
    audit(result.lastInsertRowid, "created", body);
    return { product: mapProduct(db.prepare("SELECT * FROM products WHERE id = ?").get(result.lastInsertRowid)) };
  } catch {
    return { error: "SKU or slug already exists", status: 409 };
  }
}

function updateProduct(id, body = {}) {
  const product = db.prepare("SELECT * FROM products WHERE id = ?").get(id);
  if (!product) return { error: "Product not found", status: 404 };

  const cost =
    body.supplierCostEur === undefined ? product.supplier_cost_eur : Number(body.supplierCostEur);
  const floor = body.marginFloor === undefined ? product.margin_floor : Number(body.marginFloor);
  const price =
    body.priceEur === undefined || body.priceEur === ""
      ? autoPrice(cost, floor)
      : Number(body.priceEur);

  db.prepare(`
    UPDATE products SET
      name = ?, slug = ?, description = ?, category_id = ?, supplier_cost_eur = ?,
      price_eur = ?, margin_floor = ?, stock = ?, active = ?, image_url = ?,
      seo_title = ?, seo_description = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    body.name ?? product.name,
    slugify(body.slug ?? product.slug ?? product.name),
    body.description ?? product.description,
    body.categoryId ?? product.category_id,
    cost,
    price,
    floor,
    body.stock ?? product.stock,
    body.active === undefined ? product.active : body.active ? 1 : 0,
    body.imageUrl ?? product.image_url,
    body.seoTitle ?? product.seo_title,
    body.seoDescription ?? product.seo_description,
    product.id
  );
  audit(product.id, "updated", body);
  return { product: mapProduct(db.prepare("SELECT * FROM products WHERE id = ?").get(product.id)) };
}

function bulkUpdatePrices(margin = 0.3) {
  const rows = db.prepare("SELECT id, supplier_cost_eur FROM products WHERE active = 1").all();
  const update = db.prepare("UPDATE products SET price_eur = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
  const tx = db.transaction(() => {
    for (const row of rows) {
      update.run(autoPrice(row.supplier_cost_eur, Number(margin)), row.id);
    }
  });
  tx();
  return { updated: rows.length, margin: Number(margin) };
}

function addProductImage(productId, body = {}) {
  const { url, altText = "", sortOrder = 0 } = body;
  if (!url) return { error: "url required", status: 400 };
  const product = db.prepare("SELECT id FROM products WHERE id = ?").get(productId);
  if (!product) return { error: "Product not found", status: 404 };
  const result = db
    .prepare("INSERT INTO product_images(product_id, url, alt_text, sort_order) VALUES(?,?,?,?)")
    .run(product.id, url, altText, sortOrder);
  return { image: db.prepare("SELECT * FROM product_images WHERE id = ?").get(result.lastInsertRowid) };
}

function buildSitemapXml() {
  const base = (process.env.PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://buzzard24.de").replace(
    /\/$/,
    ""
  );
  const rows = db.prepare("SELECT slug, updated_at FROM products WHERE active = 1").all();
  const urls = rows
    .map(
      (row) =>
        `<url><loc>${base}/produkt/${row.slug}/</loc><lastmod>${new Date(row.updated_at).toISOString()}</lastmod></url>`
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
}

function buildRobotsTxt() {
  const base = (process.env.PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://buzzard24.de").replace(
    /\/$/,
    ""
  );
  return `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nSitemap: ${base}/sitemap.xml`;
}

function getCatalogSeoStatus() {
  return {
    version: "0.8.0",
    enabled: isEnabled(),
    publicBaseUrl: process.env.PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://buzzard24.de",
    pricing: {
      defaultMargin: Number(process.env.DEFAULT_MARGIN || 0.3),
      minMargin: Number(process.env.MIN_MARGIN || 0.12),
    },
    totals: {
      categories: db.prepare("SELECT COUNT(*) n FROM categories WHERE active = 1").get().n,
      products: db.prepare("SELECT COUNT(*) n FROM products WHERE active = 1").get().n,
      images: db.prepare("SELECT COUNT(*) n FROM product_images").get().n,
      auditEntries: db.prepare("SELECT COUNT(*) n FROM product_audit").get().n,
    },
  };
}

module.exports = {
  isEnabled,
  slugify,
  autoPrice,
  listCategories,
  listProducts,
  getProductBySlug,
  getProductJsonLd,
  listAdminProducts,
  createCategory,
  createProduct,
  updateProduct,
  bulkUpdatePrices,
  addProductImage,
  buildSitemapXml,
  buildRobotsTxt,
  getCatalogSeoStatus,
};
