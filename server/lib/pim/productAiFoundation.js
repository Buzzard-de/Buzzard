/**
 * AI Product foundation — suggestions only, no direct critical field writes.
 */
const { AUDIT_SOURCE } = require("../../core/productConstants");
const productAi = require("../productAi");
const productAudit = require("./productAudit");

const AI_CAPABILITIES = Object.freeze([
  "title_generation",
  "description_generation",
  "attribute_extraction",
  "category_suggestion",
  "duplicate_detection",
  "seo_suggestion",
]);

function suggest(product, task) {
  if (!AI_CAPABILITIES.includes(task)) {
    throw new Error(`Unknown AI task: ${task}`);
  }
  return {
    task,
    productId: product.id,
    suggestion: null,
    requiresApproval: true,
    autoApply: false,
    note: "AI suggestions require human approval — critical fields not modified",
  };
}

async function enrichWithReview(product, options = {}) {
  const enriched = await productAi.enrichProduct(product, options);
  const review = productAi.enqueueReview({
    product_id: product.id,
    sku: product.sku,
    type: "ai_enrichment",
    payload: enriched,
    requires_approval: true,
  });
  productAudit.logChange({
    productId: product.id,
    action: "ai.enrich.requested",
    source: AUDIT_SOURCE.AI,
    metadata: { reviewId: review.id },
  });
  return { enriched, review, applied: false };
}

module.exports = { AI_CAPABILITIES, suggest, enrichWithReview };
