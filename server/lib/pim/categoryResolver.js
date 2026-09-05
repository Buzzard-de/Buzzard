/**
 * Unified supplier → Buzzard category resolution.
 * Order: explicit buzzard hint → JSON supplier mapping → DB mapping → taxonomy lookup.
 * Uncertain mappings return REVIEW_REQUIRED — never invent public categories.
 */
const supplierStore = require("../supplierStore");
const categoryEngine = require("./categoryEngine");
const { validateSupplierCategoryMapping } = require("./categoryMappingValidator");
const { BLOCKING_CODES } = require("../../core/productLifecycleConstants");

const RESOLVE_STATUS = Object.freeze({
  MAPPED: "MAPPED",
  REVIEW_REQUIRED: "REVIEW_REQUIRED",
  UNKNOWN: "UNKNOWN",
});

function resolveProductCategory({ supplierId, supplierCategory, buzzardCategoryHint } = {}) {
  let buzzardCategory = buzzardCategoryHint || null;
  let mappingSource = buzzardCategory ? "hint" : null;

  if (!buzzardCategory && supplierId && supplierCategory) {
    const fromJson = supplierStore.mapSupplierCategory(supplierId, supplierCategory);
    if (fromJson) {
      buzzardCategory = fromJson;
      mappingSource = "supplier_json_mapping";
    }
  }

  if (!buzzardCategory && supplierCategory) {
    const taxonomyHit = categoryEngine.findTaxonomyCategory(supplierCategory);
    if (taxonomyHit) {
      buzzardCategory = taxonomyHit.id || supplierCategory;
      mappingSource = "taxonomy_slug";
    }
  }

  const validation = validateSupplierCategoryMapping({
    supplierCategory,
    buzzardCategory,
    supplierCode: supplierId,
  });

  if (validation.ok) {
    const mapping = categoryEngine.getMapping(buzzardCategory);
    return {
      ok: true,
      status: RESOLVE_STATUS.MAPPED,
      categoryId: buzzardCategory,
      mappingSource,
      mainCategoryId: validation.mapping?.mainCategoryId || mapping.mainCategoryId || buzzardCategory,
      subcategoryId: validation.mapping?.subcategoryId || mapping.subcategoryId || null,
      label: validation.mapping?.label || mapping.label || buzzardCategory,
      supplierCategory: supplierCategory || null,
    };
  }

  if (supplierCategory && !buzzardCategory) {
    return {
      ok: false,
      status: RESOLVE_STATUS.REVIEW_REQUIRED,
      categoryId: null,
      mappingSource: null,
      code: BLOCKING_CODES.CATEGORY_UNMAPPED,
      supplierCategory,
      message: "Supplier category requires manual Buzzard taxonomy mapping",
    };
  }

  return {
    ok: false,
    status: RESOLVE_STATUS.UNKNOWN,
    categoryId: buzzardCategory || null,
    mappingSource,
    code: validation.code || BLOCKING_CODES.CATEGORY_UNKNOWN,
    supplierCategory: supplierCategory || null,
    message: "Category could not be resolved",
  };
}

function applyCategoryToNormalized(normalized, options = {}) {
  if (!normalized) return normalized;
  const resolved = resolveProductCategory({
    supplierId: options.supplierCode || normalized.supplierCode,
    supplierCategory: normalized.supplierCategory,
    buzzardCategoryHint: normalized.buzzardCategory,
  });

  return {
    ...normalized,
    buzzardCategory: resolved.ok ? resolved.categoryId : normalized.buzzardCategory || null,
    categoryResolution: resolved,
    subcategoryId: resolved.subcategoryId || normalized.subcategoryId || null,
  };
}

module.exports = {
  RESOLVE_STATUS,
  resolveProductCategory,
  applyCategoryToNormalized,
};
