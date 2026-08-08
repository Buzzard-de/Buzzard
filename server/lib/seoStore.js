const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..", "..");
const productsFile = path.join(rootDir, "data", "buzzard_products.json");
const categoriesFile = path.join(rootDir, "data", "buzzard_categories.json");
const overridesFile = path.join(rootDir, "data", "buzzard_seo_overrides.json");

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, "utf8") || JSON.stringify(fallback));
}

function loadOverrides() {
  return readJson(overridesFile, { products: {}, categories: {}, pages: {} });
}

function getProductOverride(productId) {
  return loadOverrides().products?.[productId] || null;
}

function getCategoryOverride(categoryId) {
  return loadOverrides().categories?.[categoryId] || null;
}

function saveOverrides(doc) {
  fs.writeFileSync(overridesFile, JSON.stringify(doc, null, 2), "utf8");
  return doc;
}

function upsertOverride(entityType, entityId, patch) {
  const doc = loadOverrides();
  doc[entityType] = doc[entityType] || {};
  doc[entityType][entityId] = { ...(doc[entityType][entityId] || {}), ...patch };
  return saveOverrides(doc);
}

module.exports = {
  loadOverrides,
  getProductOverride,
  getCategoryOverride,
  upsertOverride,
  saveOverrides,
};
