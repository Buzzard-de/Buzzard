/**
 * Part 18 — Category navigation & validation (reuses taxonomy + visibility).
 */
const categoryEngine = require("../pim/categoryEngine");
const categoryCatalog = require("./categoryCatalog");
const categoryVisibility = require("../categoryVisibility");
const { isCategoryVisibleForStorefront } = require("./storefrontVisibility");
const { validateSupplierCategoryMapping } = require("../pim/categoryMappingValidator");

function validateCategoryForListing(categoryId) {
  if (!categoryId) {
    return { ok: false, status: "BLOCKED", reason: "missing_category" };
  }
  const node = categoryEngine.findTaxonomyCategory(categoryId);
  if (!node) {
    return { ok: false, status: "BLOCKED", reason: "unknown_category" };
  }
  const vis = categoryVisibility.getCategoryStatus(categoryId);
  if (!categoryVisibility.isVisibleToCustomer(vis.status)) {
    return { ok: false, status: "HIDDEN", reason: "category_hidden", categoryId };
  }
  return { ok: true, status: "PASS", categoryId, slug: node.slug, name: node.name || node.label };
}

function validateProductCategoryMapping(product) {
  if (!product?.category) {
    return { ok: false, status: "BLOCKED", reason: "missing_product_category" };
  }
  const catCheck = validateCategoryForListing(product.category);
  if (!catCheck.ok) return catCheck;
  const mapping = validateSupplierCategoryMapping({
    supplierCategoryCode: product.supplierCategory || product.category,
    taxonomyCategoryId: product.category,
  });
  if (!mapping.ok) {
    return { ok: false, status: "BLOCKED", reason: mapping.code || "invalid_category_mapping" };
  }
  return { ok: true, status: "PASS", categoryId: product.category };
}

function getCategoryTree({ depth = 2 } = {}) {
  const mains = categoryCatalog.listMainCategories();
  if (depth < 2) return mains;
  return mains.map((cat) => ({
    ...cat,
    children: categoryCatalog.getCategoryChildren(cat.id),
  }));
}

function getCategoryReadiness() {
  const doc = categoryEngine.loadTaxonomy();
  const categories = doc.categories || [];
  const visible = categories.filter((c) => isCategoryVisibleForStorefront(c.id));
  return {
    totalCategories: categories.length,
    customerVisible: visible.length,
    navigationDepth: "MAIN → SUB → PRODUCT",
    unknownCategoryBlocked: true,
    hiddenCategoryExcluded: true,
    invalidMappingBlocked: true,
  };
}

module.exports = {
  validateCategoryForListing,
  validateProductCategoryMapping,
  getCategoryTree,
  getCategoryReadiness,
};
