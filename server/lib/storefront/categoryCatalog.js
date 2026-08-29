/**
 * Part 7 — Category catalog for storefront (read-only, visibility-aware)
 */
const categoryEngine = require("../pim/categoryEngine");
const categoryVisibility = require("../categoryVisibility");

function mapCategoryNode(node, { includeChildren = false } = {}) {
  if (!node) return null;
  const vis = categoryVisibility.getCategoryStatus(node.id);
  const visible = categoryVisibility.isVisibleToCustomer(vis.status);
  const entry = {
    id: node.id,
    slug: node.slug,
    name: node.name || node.label,
    url: node.url,
    level: node.level,
    menuOrder: node.menu_order,
    visibility: vis.status,
    customerVisible: visible,
  };
  if (includeChildren && node.children?.length) {
    entry.children = node.children
      .map((c) => mapCategoryNode(c, { includeChildren: false }))
      .filter((c) => c?.customerVisible);
  }
  return entry;
}

function listMainCategories() {
  const doc = categoryEngine.loadTaxonomy();
  const cats = doc.categories || [];
  return cats
    .sort((a, b) => (a.menu_order || 0) - (b.menu_order || 0))
    .map((c) => mapCategoryNode(c, { includeChildren: false }))
    .filter((c) => c?.customerVisible);
}

function getCategoryById(categoryId, { includeChildren = false } = {}) {
  const node = categoryEngine.findTaxonomyCategory(categoryId);
  if (!node) return null;
  const mapped = mapCategoryNode(node, { includeChildren });
  if (!mapped?.customerVisible) return null;
  return mapped;
}

function getCategoryChildren(categoryId) {
  const node = categoryEngine.findTaxonomyCategory(categoryId);
  if (!node?.children?.length) return [];
  return node.children
    .sort((a, b) => (a.menu_order || 0) - (b.menu_order || 0))
    .map((c) => mapCategoryNode(c, { includeChildren: false }))
    .filter((c) => c?.customerVisible);
}

module.exports = {
  listMainCategories,
  getCategoryById,
  getCategoryChildren,
};
