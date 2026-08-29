const { db } = require("../db");
const { QUALITY_DIMENSIONS } = require("../../core/productConstants");
const mediaService = require("./mediaService");

function scoreDimension(name, value) {
  if (value === true || value === "PASS") return 100;
  if (value === "WARNING") return 50;
  if (value === false || value === "FAIL") return 0;
  if (typeof value === "number") return Math.min(100, Math.max(0, value));
  return 0;
}

function computeScore(product) {
  const media = mediaService.validateMedia(product.id);
  const scores = {
    identity: scoreDimension("identity", Boolean(product.sku && (product.ean || product.gtin))),
    content: scoreDimension("content", product.title && product.description ? 100 : product.title ? 50 : 0),
    media: scoreDimension("media", media.valid ? 100 : media.images ? 50 : 0),
    pricing: scoreDimension("pricing", product.price > 0 ? 100 : 0),
    stock: scoreDimension("stock", product.stock > 0 ? 100 : 0),
    category: scoreDimension("category", product.category ? 100 : 0),
    seo: scoreDimension("seo", product.seo?.slug && product.seo?.metaTitle ? 100 : 0),
    supplier: scoreDimension("supplier", product.supplier ? 100 : 0),
  };

  const total = QUALITY_DIMENSIONS.reduce((sum, d) => sum + (scores[d] || 0), 0);
  const finalScore = Math.round(total / QUALITY_DIMENSIONS.length);
  return { score: finalScore, dimensions: scores };
}

function updateScore(productId) {
  const productCore = require("./productCore");
  const product = productCore.getProduct(productId);
  if (!product) return 0;
  const { score, dimensions } = computeScore(product);
  db.prepare("UPDATE pim_core_products SET quality_score = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(
    score,
    productId
  );
  return { score, dimensions };
}

module.exports = { computeScore, updateScore, QUALITY_DIMENSIONS };
