/**
 * Supplier → Buzzard automotive category mapping (dry-run only).
 */
const fs = require("fs");
const path = require("path");
const taxonomy = require("../../core/automotive/automotiveTaxonomy");

const MAPPING_FILE = path.join(__dirname, "..", "..", "..", "data", "automotive", "supplier_category_mappings.json");

function loadMappings() {
  try {
    const doc = JSON.parse(fs.readFileSync(MAPPING_FILE, "utf8"));
    return Array.isArray(doc.mappings) ? doc.mappings : [];
  } catch {
    return [];
  }
}

function saveMappings(mappings) {
  fs.mkdirSync(path.dirname(MAPPING_FILE), { recursive: true });
  fs.writeFileSync(
    MAPPING_FILE,
    JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), mappings }, null, 2) + "\n"
  );
}

function validateMapping(mapping) {
  const errors = [];
  if (!mapping?.supplier) errors.push("supplier is required");
  if (!mapping?.supplierCategory) errors.push("supplierCategory is required");
  if (!mapping?.buzzardCategoryId) errors.push("buzzardCategoryId is required");
  if (mapping?.buzzardCategoryId && !taxonomy.getCategoryById(mapping.buzzardCategoryId)) {
    errors.push("unknown buzzardCategoryId");
  }
  if (mapping?.buzzardSubcategoryId && !taxonomy.getCategoryById(mapping.buzzardSubcategoryId)) {
    errors.push("unknown buzzardSubcategoryId");
  }
  if (mapping?.buzzardSubSubcategoryId && !taxonomy.getCategoryById(mapping.buzzardSubSubcategoryId)) {
    errors.push("unknown buzzardSubSubcategoryId");
  }
  return { valid: errors.length === 0, errors };
}

function resolveSupplierCategory(supplier, supplierCategory, supplierSubcategory, supplierProductType) {
  const mappings = loadMappings();
  const match = mappings.find(
    (m) =>
      m.supplier === supplier &&
      m.supplierCategory === supplierCategory &&
      (m.supplierSubcategory == null || m.supplierSubcategory === supplierSubcategory) &&
      (m.supplierProductType == null || m.supplierProductType === supplierProductType)
  );
  if (!match) {
    return { mapped: false, supplier, supplierCategory, supplierSubcategory, supplierProductType };
  }
  return {
    mapped: true,
    buzzardCategoryId: match.buzzardCategoryId,
    buzzardSubcategoryId: match.buzzardSubcategoryId || null,
    buzzardSubSubcategoryId: match.buzzardSubSubcategoryId || null,
  };
}

function upsertMapping(mapping) {
  const check = validateMapping(mapping);
  if (!check.valid) return { success: false, errors: check.errors };
  const mappings = loadMappings();
  const idx = mappings.findIndex(
    (m) =>
      m.supplier === mapping.supplier &&
      m.supplierCategory === mapping.supplierCategory &&
      m.supplierSubcategory === mapping.supplierSubcategory &&
      m.supplierProductType === mapping.supplierProductType
  );
  if (idx >= 0) mappings[idx] = { ...mappings[idx], ...mapping };
  else mappings.push(mapping);
  saveMappings(mappings);
  return { success: true, mapping };
}

module.exports = {
  MAPPING_FILE,
  loadMappings,
  saveMappings,
  validateMapping,
  resolveSupplierCategory,
  upsertMapping,
};
