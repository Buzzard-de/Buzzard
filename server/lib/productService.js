/**
 * Canonical Product Service. Reads/writes D via productCore.
 * Legacy tables are not written here.
 */
const productCore = require("./pim/productCore");
const productSot = require("./productSot");
const events = require("./eventBus");
const { db } = require("./db");
const { PRODUCT_STATUS } = require("../core/productConstants");

function getProduct(id) {
  return productCore.getProduct(id);
}

function getProductBySku(sku) {
  if (!sku) return null;
  return productCore.getProduct(sku);
}

function getProductByEan(ean) {
  if (!ean) return null;
  const row = db.prepare("SELECT id FROM pim_core_products WHERE ean = ? OR gtin = ?").get(ean, ean);
  return row ? productCore.getProduct(row.id) : null;
}

function listProducts(query = {}) {
  return productCore.listProducts(query);
}

function createProduct(input, ctx = {}) {
  const targets = ["D"];
  if (ctx.legacyTarget) targets.push(String(ctx.legacyTarget));
  productSot.assertNoDualWrite(targets);
  productSot.assertCanonicalWrite("D");
  const product = productCore.createProduct(input, ctx);
  events.emit({
    type: events.TYPES.ProductCreated,
    aggregateId: product.id,
    aggregateType: "product",
    payload: { id: product.id, sku: product.sku },
    correlationId: ctx.correlationId || null,
  });
  return { ...product, created: true, canonical: true, canonicalProductId: product.id };
}

function recordCanonicalProduct(input = {}, ctx = {}) {
  const sku = String(input.sku || "").trim();
  if (!sku) return { error: "SKU required", code: "SKU_REQUIRED", status: 400 };
  const existing = productCore.getProduct(sku);
  if (existing) {
    return { ...existing, created: false, canonical: true, canonicalProductId: existing.id };
  }
  try {
    return createProduct(
      {
        ...input,
        sku,
        title: input.title || input.name || sku,
        price: input.price ?? input.priceEur ?? input.sellingPrice ?? input.selling_price ?? 0,
        stock: input.stock ?? input.stockQty ?? input.stock_qty ?? 0,
        ean: input.ean || input.ean_gtin || null,
        gtin: input.gtin || input.ean || input.ean_gtin || null,
      },
      ctx
    );
  } catch (error) {
    if (String(error.code || "").startsWith("duplicate_")) {
      const again = productCore.getProduct(sku);
      if (again) return { ...again, created: false, canonical: true, canonicalProductId: again.id };
    }
    return { error: error.message, code: error.code || "PRODUCT_REJECTED", status: error.status || 409 };
  }
}

function linkProjection({ sourceSystem, sourceId, sourceSku, targetProductId, targetSku, evidence }) {
  if (!sourceSystem || sourceId == null || !targetProductId) return;
  try {
    productSot.upsertIdentityMap({
      sourceSystem,
      sourceId: String(sourceId),
      sourceSku: sourceSku || null,
      targetProductId,
      targetSku: targetSku || sourceSku || null,
      mappingStatus: "MAPPED",
      collisionStatus: "NONE",
      confidence: 1,
      evidence: evidence || "productService.linkProjection",
    });
  } catch {
    /* identity map is optional for ancient fixtures */
  }
}

function updateProduct(id, input, ctx = {}) {
  productSot.assertCanonicalWrite("D");
  const product = productCore.updateProduct(id, input, ctx);
  events.emit({
    type: events.TYPES.ProductUpdated,
    aggregateId: product.id,
    aggregateType: "product",
    payload: { id: product.id, sku: product.sku },
    correlationId: ctx.correlationId || null,
  });
  return product;
}

function archiveProduct(id, ctx = {}) {
  productSot.assertCanonicalWrite("D");
  const product = productCore.updateProduct(id, { visibility: "HIDDEN" }, ctx);
  if (product.status !== PRODUCT_STATUS.ARCHIVED) {
    try {
      productCore.transitionStatus(id, PRODUCT_STATUS.ARCHIVED, ctx);
    } catch {
      /* invalid transition stays hidden; no data loss */
    }
  }
  const after = getProduct(id);
  events.emit({
    type: events.TYPES.ProductArchived,
    aggregateId: id,
    aggregateType: "product",
    payload: { id, sku: after?.sku },
    correlationId: ctx.correlationId || null,
  });
  return after;
}

module.exports = {
  getProduct,
  getProductBySku,
  getProductByEan,
  listProducts,
  createProduct,
  recordCanonicalProduct,
  linkProjection,
  updateProduct,
  archiveProduct,
};
