/**
 * Central automotive taxonomy resolver.
 */
const taxonomy = require("../../core/automotive/automotiveTaxonomy");
const { getAttributesForCategory } = require("../../core/automotive/automotiveAttributes");
const { getFiltersForCategory } = require("../../core/automotive/automotiveFilters");

function resolveCategory(categoryId) {
  const category = taxonomy.getCategoryById(categoryId);
  if (!category) return null;
  return {
    ...category,
    url: taxonomy.getCategoryUrl(category),
    attributes: getAttributesForCategory(category.level === 2 ? category.id : category.parentId),
    filters: getFiltersForCategory(category.level === 2 ? category.id : taxonomy.getCategoryById(category.parentId)?.id),
  };
}

function resolveBySlugPath(subcategory, subSubcategory) {
  const path = [subcategory, subSubcategory].filter(Boolean).join("/");
  const category = taxonomy.getCategoryBySlugPath(path);
  return category ? resolveCategory(category.id) : null;
}

function resolveBreadcrumb(categoryId) {
  const chain = [];
  let current = taxonomy.getCategoryById(categoryId);
  while (current) {
    chain.unshift({
      id: current.id,
      slug: current.slug,
      name: current.name,
      url: taxonomy.getCategoryUrl(current),
      level: current.level,
    });
    current = current.parentId ? taxonomy.getCategoryById(current.parentId) : null;
  }
  return chain;
}

function resolveProductCategories(product) {
  return {
    categoryId: product.categoryId || "automotive",
    subcategoryId: product.subcategoryId || null,
    subSubcategoryId: product.subSubcategoryId || null,
    category: product.categoryId ? resolveCategory(product.categoryId) : null,
    subcategory: product.subcategoryId ? resolveCategory(product.subcategoryId) : null,
    subSubcategory: product.subSubcategoryId ? resolveCategory(product.subSubcategoryId) : null,
  };
}

function searchCategories(query = "") {
  const q = String(query).trim().toLowerCase();
  if (!q) return taxonomy.getSubcategories();
  return taxonomy.flattenCategories().filter((node) => {
    const names = Object.values(node.name || {}).join(" ").toLowerCase();
    return names.includes(q) || node.slug.includes(q);
  });
}

module.exports = {
  resolveCategory,
  resolveBySlugPath,
  resolveBreadcrumb,
  resolveProductCategories,
  searchCategories,
  getAutomotiveTaxonomy: taxonomy.getAutomotiveTaxonomy,
  getSubcategories: taxonomy.getSubcategories,
  getCategoryUrl: taxonomy.getCategoryUrl,
};
