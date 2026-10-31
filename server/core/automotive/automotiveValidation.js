/**
 * Automotive taxonomy validation — fail-closed, no auto-publish.
 */
const {
  getCategoryById,
  flattenCategories,
  getAutomotiveRoot,
  AUTOMOTIVE_ROOT_ID,
  AUTOMOTIVE_SAFETY_POLICY,
  PRODUCT_STATES,
} = require("./automotiveTaxonomy");
const { validateAttributeKey } = require("./automotiveAttributes");
const { validateCompatibilitySchema } = require("./automotiveVehicleCompatibility");

function validateCategoryNode(category) {
  const errors = [];
  if (!category?.id) errors.push("category.id is required");
  if (!category?.slug) errors.push("category.slug is required");
  for (const locale of ["de", "en", "tr", "ar"]) {
    if (!category?.name?.[locale]) errors.push(`name.${locale} is required`);
  }
  if (![1, 2, 3].includes(category.level) && category.level > 3) {
    errors.push("invalid level");
  }
  return { valid: errors.length === 0, errors };
}

function validateTaxonomyIntegrity() {
  const errors = [];
  const nodes = flattenCategories();
  const ids = new Set();
  const slugPaths = new Set();

  for (const node of nodes) {
    if (ids.has(node.id)) errors.push(`duplicate id: ${node.id}`);
    ids.add(node.id);

    const catCheck = validateCategoryNode(node);
    if (!catCheck.valid) errors.push(...catCheck.errors.map((e) => `${node.id}: ${e}`));

    if (node.parentId && !getCategoryById(node.parentId)) {
      errors.push(`orphan category: ${node.id} parent ${node.parentId}`);
    }
  }

  const root = getAutomotiveRoot();
  if (!root) errors.push("automotive root missing");

  // Full slug-path uniqueness (slug may repeat under different parents)
  function collectPaths(node, parts = []) {
    const next = node.id === AUTOMOTIVE_ROOT_ID ? parts : [...parts, node.slug];
    const key = next.join("/");
    if (key && slugPaths.has(key)) errors.push(`duplicate slug path: ${key}`);
    if (key) slugPaths.add(key);
    for (const child of node.children || []) collectPaths(child, next);
  }
  if (root) collectPaths(root, []);

  const subcategories = nodes.filter((n) => n.level === 2);
  if (subcategories.length < 15) errors.push("expected at least 15 subcategories");

  return { valid: errors.length === 0, errors, stats: { total: nodes.length, subcategories: subcategories.length } };
}

function validateAutomotiveProduct(product) {
  const errors = [];
  if (!product?.sku) errors.push("sku is required");
  if (!product?.categoryId) errors.push("categoryId is required");

  const category = getCategoryById(product.categoryId);
  if (!category) errors.push("unknown categoryId");

  if (product?.subcategoryId && !getCategoryById(product.subcategoryId)) {
    errors.push("unknown subcategoryId");
  }
  if (product?.subSubcategoryId && !getCategoryById(product.subSubcategoryId)) {
    errors.push("unknown subSubcategoryId");
  }

  if (!product?.state) errors.push("state is required");
  if (product?.state && !PRODUCT_STATES.includes(product.state)) errors.push("invalid product state");
  if (product?.state === "PUBLISHED") errors.push("automatic publishing is forbidden");

  if (product?.attributes) {
    for (const key of Object.keys(product.attributes)) {
      if (!validateAttributeKey(key)) errors.push(`unknown attribute: ${key}`);
    }
  }

  if (product?.compatibleVehicles?.length) {
    for (const vehicle of product.compatibleVehicles) {
      const compat = validateCompatibilitySchema(vehicle);
      if (!compat.valid) errors.push(...compat.errors.map((e) => `compatibility: ${e}`));
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    root: getAutomotiveRoot()?.id,
    safety: AUTOMOTIVE_SAFETY_POLICY,
  };
}

function validateSafetyPolicy() {
  const policy = AUTOMOTIVE_SAFETY_POLICY;
  const violations = [];
  if (policy.autoActivate) violations.push("autoActivate must be false");
  if (policy.activationAllowed) violations.push("activationAllowed must be false");
  if (policy.supplierLive) violations.push("supplierLive must be false");
  if (policy.salesEnabled) violations.push("salesEnabled must be false");
  if (policy.publishEnabled) violations.push("publishEnabled must be false");
  if (!policy.diagnosticOnly) violations.push("diagnosticOnly must be true");
  if (!policy.humanApprovalRequired) violations.push("humanApprovalRequired must be true");
  if (policy.ready !== false) violations.push("ready must be false");
  if (policy.status !== "BLOCKED") violations.push('status must be "BLOCKED"');
  return { valid: violations.length === 0, violations, policy };
}

module.exports = {
  validateCategoryNode,
  validateTaxonomyIntegrity,
  validateAutomotiveProduct,
  validateSafetyPolicy,
};
