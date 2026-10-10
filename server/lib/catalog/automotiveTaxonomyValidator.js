const {
  AUTOMOTIVE_ROOT,
  AUTOMOTIVE_CATEGORIES,
  VEHICLE_TYPES,
  PRODUCT_STATES,
} = require("../../core/automotiveTaxonomy");

function validateAutomotiveCategory(category) {
  const errors = [];
  if (!category?.id) errors.push("category.id is required");
  if (!category?.slug) errors.push("category.slug is required");
  if (!category?.name?.de) errors.push("German name is required");
  if (!category?.name?.en) errors.push("English name is required");
  return { valid: errors.length === 0, errors };
}

function validateAutomotiveProduct(product) {
  const errors = [];
  if (!product?.sku) errors.push("sku is required");
  if (!product?.categoryId) errors.push("categoryId is required");
  if (!AUTOMOTIVE_CATEGORIES.some((c) => c.id === product.categoryId)) {
    errors.push("unknown automotive category");
  }
  if (!product?.state) errors.push("state is required");
  if (product?.state && !PRODUCT_STATES.includes(product.state)) {
    errors.push("invalid product state");
  }
  if (product?.vehicleType && !VEHICLE_TYPES.includes(product.vehicleType)) {
    errors.push("invalid vehicleType");
  }
  if (product?.state === "PUBLISHED") {
    errors.push("automatic publishing is forbidden");
  }
  return {
    valid: errors.length === 0,
    errors,
    root: AUTOMOTIVE_ROOT.id,
  };
}

module.exports = {
  validateAutomotiveCategory,
  validateAutomotiveProduct,
};
