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
  productSot.assertCanonicalWrite("D");
  const product = productCore.createProduct(input, ctx);
  events.emit({
    type: events.TYPES.ProductCreated,
    aggregateId: product.id,
    aggregateType: "product",
    payload: { id: product.id, sku: product.sku },
    correlationId: ctx.correlationId || null,
  });
  return product;
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
  updateProduct,
  archiveProduct,
};
