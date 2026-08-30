/**
 * Part 16 — Supplier category → Buzzard taxonomy mapping validation.
 * Unknown categories BLOCK staging — no silent random placement.
 */
const categoryEngine = require("./categoryEngine");
const { BLOCKING_CODES } = require("../../core/productLifecycleConstants");

function validateSupplierCategoryMapping({ supplierCategory, buzzardCategory, supplierCode } = {}) {
  const issues = [];

  const targetCategory = buzzardCategory || supplierCategory;
  if (!targetCategory) {
    return {
      ok: false,
      blocked: true,
      code: BLOCKING_CODES.CATEGORY_UNKNOWN,
      issues: [BLOCKING_CODES.CATEGORY_UNKNOWN],
      mapping: null,
    };
  }

  const taxonomyHit = categoryEngine.findTaxonomyCategory(targetCategory);
  const mapping = categoryEngine.getMapping(targetCategory);

  if (!taxonomyHit && !mapping.exists) {
    issues.push(BLOCKING_CODES.CATEGORY_UNMAPPED);
    return {
      ok: false,
      blocked: true,
      code: BLOCKING_CODES.CATEGORY_UNMAPPED,
      issues,
      mapping: {
        supplierCategory: supplierCategory || null,
        buzzardCategory: targetCategory,
        supplierCode: supplierCode || null,
        exists: false,
      },
    };
  }

  return {
    ok: true,
    blocked: false,
    mapping: {
      supplierCategory: supplierCategory || null,
      buzzardCategory: targetCategory,
      supplierCode: supplierCode || null,
      exists: true,
      label: mapping.label || taxonomyHit?.name || taxonomyHit?.label || targetCategory,
      mainCategoryId: mapping.mainCategoryId || targetCategory,
      subcategoryId: mapping.subcategoryId || null,
      subSubcategoryId: mapping.subSubcategoryId || null,
    },
  };
}

module.exports = {
  validateSupplierCategoryMapping,
};
