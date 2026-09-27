/**
 * PIM ↔ Automotive taxonomy bridge — validation only, no publish.
 */
const taxonomyResolver = require("./taxonomyResolver");
const productCategoryValidator = require("./productCategoryValidator");
const categoryMapping = require("./categoryMapping");
const { runAutomotiveProductPipeline, isAutomotiveProduct } = require("./automotiveProductPipeline");
const { AUTOMOTIVE_SAFETY_POLICY } = require("../../core/automotive/automotiveTaxonomy");

function resolveProductTaxonomy(product) {
  const mapped =
    product.supplierCategory
      ? categoryMapping.resolveSupplierCategory(
          product.supplier || "mock",
          product.supplierCategory,
          product.supplierSubcategory,
          product.supplierProductType
        )
      : null;

  const categoryId = product.categoryId || mapped?.buzzardCategoryId || "automotive";
  const subcategoryId = product.subcategoryId || mapped?.buzzardSubcategoryId || null;
  const subSubcategoryId = product.subSubcategoryId || mapped?.buzzardSubSubcategoryId || null;

  return {
    categoryId,
    subcategoryId,
    subSubcategoryId,
    mapped: Boolean(mapped?.mapped),
    refs: taxonomyResolver.resolveProductCategories({
      categoryId,
      subcategoryId,
      subSubcategoryId,
    }),
  };
}

function validatePimProduct(product, options = {}) {
  const taxonomy = resolveProductTaxonomy(product);
  const pipeline = runAutomotiveProductPipeline(
    {
      ...product,
      categoryId: taxonomy.categoryId,
      subcategoryId: taxonomy.subcategoryId,
      subSubcategoryId: taxonomy.subSubcategoryId,
    },
    options
  );

  return {
    valid: pipeline.ok,
    errors: pipeline.errors,
    taxonomy,
    pipeline,
    catalogReadiness: pipeline.status,
    publishAllowed: false,
    safety: AUTOMOTIVE_SAFETY_POLICY,
  };
}

function getAutomotivePimStatus() {
  return {
    connected: true,
    publishEnabled: false,
    supplierLive: false,
    pipeline: [
      "automotive_taxonomy",
      "pim",
      "supplier_category_mapping",
      "product_validation",
      "gtin_ean_mpn",
      "vehicle_compatibility",
      "image_control",
      "language_seo",
      "admin_review",
      "approved",
      "manual_publish",
    ],
    safety: AUTOMOTIVE_SAFETY_POLICY,
  };
}

module.exports = {
  resolveProductTaxonomy,
  validatePimProduct,
  getAutomotivePimStatus,
  isAutomotiveProduct,
  runAutomotiveProductPipeline,
};
