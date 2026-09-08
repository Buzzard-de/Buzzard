/**
 * Automotive Core — data-driven 12-category tree engine.
 */
const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "..", "..", "..", "data", "automotive", "automotive_core_12_categories.json");

let _cache = null;
let _index = null;

function loadCategoryData() {
  if (_cache) return _cache;
  try {
    _cache = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    _cache = { categories: [], stats: {} };
  }
  return _cache;
}

function buildIndex() {
  if (_index) return _index;
  const data = loadCategoryData();
  const byId = new Map();
  const bySlug = new Map();

  for (const cat of data.categories || []) {
    byId.set(cat.id, cat);
    bySlug.set(cat.slug, cat);
    for (const sub of cat.subcategories || cat.children || []) {
      byId.set(sub.id, { ...sub, parentId: cat.id, topCategoryId: cat.id });
      bySlug.set(`${cat.slug}/${sub.slug}`, sub);
      for (const pt of sub.productTypes || []) {
        byId.set(pt.id, { ...pt, parentId: sub.id, topCategoryId: cat.id, level: "productType" });
      }
    }
  }

  _index = { byId, bySlug, data };
  return _index;
}

function invalidateCategoryCache() {
  _cache = null;
  _index = null;
}

function listTopCategories() {
  return loadCategoryData().categories || [];
}

function getCategoryById(id) {
  return buildIndex().byId.get(id) || null;
}

function getCategoryBySlug(slug) {
  return buildIndex().bySlug.get(slug) || null;
}

function getCategoryTree() {
  const data = loadCategoryData();
  return {
    engine: "automotive_core",
    version: data.version,
    categories: data.categories,
    stats: data.stats,
    categoryCount: data.categoryCount || (data.categories || []).length,
  };
}

function getCategoryStats() {
  const data = loadCategoryData();
  return data.stats || { topLevel: 0, subcategories: 0, productTypes: 0 };
}

function validateCategoryPath(categoryId, subCategoryId, subSubCategoryId, productType) {
  const cat = getCategoryById(categoryId);
  if (!cat || !cat.subcategories) {
    return { valid: false, status: "BLOCKED", reason: "AUTOMOTIVE_CATEGORY_INVALID" };
  }
  if (!subCategoryId) {
    return { valid: true, status: "PASS", level: "category", category: cat };
  }
  const sub = getCategoryById(subCategoryId);
  if (!sub || sub.topCategoryId !== categoryId) {
    return { valid: false, status: "REVIEW_REQUIRED", reason: "AUTOMOTIVE_MAPPING_UNCERTAIN" };
  }
  if (!subSubCategoryId && !productType) {
    return { valid: true, status: "PASS", level: "subCategory", category: cat, subCategory: sub };
  }
  const pt = productType ? getCategoryById(productType) : getCategoryById(subSubCategoryId);
  if (pt && pt.topCategoryId === categoryId) {
    return { valid: true, status: "PASS", level: "productType", category: cat, subCategory: sub, productType: pt };
  }
  return { valid: false, status: "REVIEW_REQUIRED", reason: "AUTOMOTIVE_MAPPING_UNCERTAIN" };
}

function getSearchRulesForCategory(categoryId) {
  const cat = getCategoryById(categoryId);
  if (!cat) return null;
  return cat.searchRules || { fields: ["sku", "brand", "mpn"] };
}

function mapLegacyCategoryId(legacyId) {
  const data = loadCategoryData();
  return (data.categories || []).find((c) => c.legacyCategoryId === legacyId) || null;
}

module.exports = {
  loadCategoryData,
  invalidateCategoryCache,
  listTopCategories,
  getCategoryById,
  getCategoryBySlug,
  getCategoryTree,
  getCategoryStats,
  validateCategoryPath,
  getSearchRulesForCategory,
  mapLegacyCategoryId,
};
