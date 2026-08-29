/**
 * Part 6 — Product Core (category-agnostic PIM)
 */
const crypto = require("crypto");
const { db } = require("../db");
const { PRODUCT_STATUS, canTransition, SALES_BLOCKED_STATUSES } = require("../../core/productConstants");
const productAudit = require("./productAudit");
const productIdentifiers = require("./productIdentifiers");
const qualityScore = require("./qualityScore");

function newId(prefix = "pim_prod") {
  return `${prefix}_${crypto.randomBytes(6).toString("hex")}`;
}

function parseJson(val, fallback = {}) {
  try {
    return val ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
}

function mapProduct(row) {
  if (!row) return null;
  return {
    id: row.id,
    sku: row.sku,
    supplierSku: row.supplier_sku,
    ean: row.ean,
    gtin: row.gtin,
    mpn: row.mpn,
    brandId: row.brand_id,
    manufacturer: row.manufacturer,
    title: row.title,
    description: row.description,
    shortDescription: row.short_description,
    category: row.taxonomy_category_id,
    subcategory: row.subcategory_id,
    pimCategoryId: row.pim_category_id,
    attributes: parseJson(row.attributes_json),
    variants: [],
    images: [],
    documents: [],
    price: row.price,
    currency: row.currency || "EUR",
    stock: row.stock,
    supplier: row.supplier_id,
    status: row.status,
    visibility: row.visibility,
    seo: parseJson(row.seo_json),
    metadata: parseJson(row.metadata_json),
    qualityScore: row.quality_score,
    parentProductId: row.parent_product_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function attachRelations(product) {
  if (!product) return null;
  product.variants = db.prepare("SELECT * FROM pim_core_variants WHERE product_id = ?").all(product.id).map((v) => ({
    id: v.id,
    sku: v.sku,
    axis: v.axis,
    value: v.value,
    ean: v.ean,
    priceDelta: v.price_delta,
    stock: v.stock,
  }));
  product.images = db.prepare(`
    SELECT * FROM pim_core_media WHERE product_id = ? AND media_type = 'image' ORDER BY is_primary DESC, sort_order
  `).all(product.id);
  product.documents = db.prepare(`
    SELECT * FROM pim_core_media WHERE product_id = ? AND media_type != 'image' ORDER BY sort_order
  `).all(product.id);
  if (product.brandId) {
    const brand = db.prepare("SELECT * FROM pim_core_brands WHERE id = ?").get(product.brandId);
    product.brand = brand ? { id: brand.id, name: brand.name, slug: brand.slug } : null;
  }
  return product;
}

function listProducts({ status, category, q, limit = 50, offset = 0 } = {}) {
  let sql = "SELECT * FROM pim_core_products WHERE 1=1";
  const params = [];
  if (status) {
    sql += " AND status = ?";
    params.push(status);
  }
  if (category) {
    sql += " AND taxonomy_category_id = ?";
    params.push(category);
  }
  if (q) {
    sql += " AND (sku LIKE ? OR title LIKE ? OR ean LIKE ? OR gtin LIKE ? OR mpn LIKE ?)";
    const like = `%${q}%`;
    params.push(like, like, like, like, like);
  }
  sql += " ORDER BY updated_at DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);
  return db.prepare(sql).all(...params).map(mapProduct).map(attachRelations);
}

function getProduct(idOrSku) {
  let row = db.prepare("SELECT * FROM pim_core_products WHERE id = ?").get(idOrSku);
  if (!row) row = db.prepare("SELECT * FROM pim_core_products WHERE sku = ?").get(idOrSku);
  return attachRelations(mapProduct(row));
}

function createProduct(input, { source = "ADMIN", actorId } = {}) {
  const sku = String(input.sku || "").trim();
  if (!sku) throw new Error("SKU required");
  productIdentifiers.assertUnique({ sku, ean: input.ean, gtin: input.gtin, mpn: input.mpn });

  const id = input.id || newId();
  db.prepare(`
    INSERT INTO pim_core_products(
      id, sku, supplier_sku, ean, gtin, mpn, brand_id, manufacturer, title, description,
      short_description, taxonomy_category_id, subcategory_id, pim_category_id,
      attributes_json, price, currency, stock, supplier_id, status, visibility, seo_json, metadata_json
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    id,
    sku,
    input.supplierSku || null,
    input.ean || null,
    input.gtin || input.ean || null,
    input.mpn || null,
    input.brandId || null,
    input.manufacturer || null,
    input.title || sku,
    input.description || null,
    input.shortDescription || null,
    input.category || input.taxonomyCategoryId || null,
    input.subcategory || null,
    input.pimCategoryId || null,
    JSON.stringify(input.attributes || {}),
    Number(input.price) || 0,
    input.currency || "EUR",
    Number(input.stock) || 0,
    input.supplier || input.supplierId || null,
    input.status || PRODUCT_STATUS.DRAFT,
    input.visibility || "HIDDEN",
    JSON.stringify(input.seo || {}),
    JSON.stringify(input.metadata || {})
  );

  const product = getProduct(id);
  qualityScore.updateScore(id);
  productAudit.logChange({
    productId: id,
    action: "product.create",
    source,
    actorId,
    after: product,
  });
  return product;
}

function updateProduct(id, patch, { source = "ADMIN", actorId } = {}) {
  const before = getProduct(id);
  if (!before) throw new Error("Product not found");

  if (patch.status && patch.status !== before.status) {
    transitionStatus(id, patch.status, { source, actorId });
  }

  const fields = [];
  const params = [];
  const map = {
    supplierSku: "supplier_sku",
    ean: "ean",
    gtin: "gtin",
    mpn: "mpn",
    brandId: "brand_id",
    manufacturer: "manufacturer",
    title: "title",
    description: "description",
    shortDescription: "short_description",
    category: "taxonomy_category_id",
    subcategory: "subcategory_id",
    pimCategoryId: "pim_category_id",
    price: "price",
    currency: "currency",
    stock: "stock",
    supplier: "supplier_id",
    visibility: "visibility",
  };

  for (const [key, col] of Object.entries(map)) {
    if (patch[key] !== undefined) {
      fields.push(`${col} = ?`);
      params.push(patch[key]);
    }
  }
  if (patch.attributes !== undefined) {
    fields.push("attributes_json = ?");
    params.push(JSON.stringify(patch.attributes));
  }
  if (patch.seo !== undefined) {
    fields.push("seo_json = ?");
    params.push(JSON.stringify(patch.seo));
  }
  if (patch.metadata !== undefined) {
    fields.push("metadata_json = ?");
    params.push(JSON.stringify(patch.metadata));
  }

  if (fields.length) {
    fields.push("updated_at = CURRENT_TIMESTAMP");
    params.push(id);
    db.prepare(`UPDATE pim_core_products SET ${fields.join(", ")} WHERE id = ?`).run(...params);
  }

  if (patch.ean || patch.gtin || patch.mpn || patch.sku) {
    productIdentifiers.assertUnique({
      sku: patch.sku || before.sku,
      ean: patch.ean ?? before.ean,
      gtin: patch.gtin ?? before.gtin,
      mpn: patch.mpn ?? before.mpn,
      excludeId: id,
    });
  }

  const after = getProduct(id);
  qualityScore.updateScore(id);
  productAudit.logChange({
    productId: id,
    action: "product.update",
    source,
    actorId,
    before,
    after,
  });
  return after;
}

function transitionStatus(id, toStatus, { source = "ADMIN", actorId } = {}) {
  const product = getProduct(id);
  if (!product) throw new Error("Product not found");
  const from = product.status;
  if (!canTransition(from, toStatus)) {
    throw new Error(`Invalid transition ${from} → ${toStatus}`);
  }
  if (toStatus === PRODUCT_STATUS.ACTIVE && SALES_BLOCKED_STATUSES.has(from)) {
    throw new Error("BLOCKED products cannot become ACTIVE");
  }
  if (process.env.BUZZARD_SALES_ENABLED !== "1" && toStatus === PRODUCT_STATUS.ACTIVE) {
    throw new Error("Sales disabled — ACTIVE status not allowed");
  }
  db.prepare("UPDATE pim_core_products SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(toStatus, id);
  productAudit.logChange({
    productId: id,
    action: "product.status",
    source,
    actorId,
    fieldName: "status",
    before: { status: from },
    after: { status: toStatus },
  });
  return getProduct(id);
}

module.exports = {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  transitionStatus,
  mapProduct,
  newId,
};
