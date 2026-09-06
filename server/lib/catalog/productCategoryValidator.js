/**
 * Product category relationship validator for automotive catalog.
 */
const { validateAutomotiveProduct } = require("../../core/automotive/automotiveValidation");
const taxonomyResolver = require("./taxonomyResolver");
const { validateCompatibilitySchema } = require("../../core/automotive/automotiveVehicleCompatibility");
const { getAttributesForCategory } = require("../../core/automotive/automotiveAttributes");

function validateProductCategoryRefs(product) {
  const base = validateAutomotiveProduct(product);
  const errors = [...base.errors];
  const refs = taxonomyResolver.resolveProductCategories(product);

  if (product.subcategoryId && refs.subcategory?.parentId !== product.categoryId && product.categoryId !== "automotive") {
    errors.push("subcategory parent mismatch");
  }
  if (product.subSubcategoryId && refs.subSubcategory?.parentId !== product.subcategoryId) {
    errors.push("sub-subcategory parent mismatch");
  }

  const attrCategoryId = product.subcategoryId || product.categoryId;
  const allowed = new Set(getAttributesForCategory(attrCategoryId));
  if (product.attributes) {
    for (const key of Object.keys(product.attributes)) {
      if (!allowed.has(key)) errors.push(`attribute not allowed for category: ${key}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    refs,
    catalogReadiness: errors.length === 0 ? "READY_FOR_REVIEW" : "BLOCKED",
    publishAllowed: false,
  };
}

function validateCatalogReadiness(product) {
  const result = validateProductCategoryRefs(product);
  const fitmentOk =
    !product.compatibleVehicles?.length ||
    product.compatibleVehicles.every((v) => validateCompatibilitySchema(v).valid);

  if (!fitmentOk) result.errors.push("invalid vehicle compatibility");
  result.valid = result.errors.length === 0;
  result.catalogReadiness = result.valid ? "READY_FOR_REVIEW" : "BLOCKED";
  return result;
}

module.exports = {
  validateProductCategoryRefs,
  validateCatalogReadiness,
};
