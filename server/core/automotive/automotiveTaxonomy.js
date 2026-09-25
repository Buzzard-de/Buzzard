/**
 * Buzzard Automotive & Motor Vehicles — central taxonomy registry.
 * Structural catalog infrastructure only — no supplier/sales/publish activation.
 */
const fs = require("fs");
const path = require("path");

const TREE_FILE = path.join(__dirname, "..", "..", "..", "data", "automotive", "automotive_category_tree.json");

const AUTOMOTIVE_ROOT_ID = "automotive";

const AUTOMOTIVE_SAFETY_POLICY = Object.freeze({
  ready: false,
  status: "BLOCKED",
  diagnosticOnly: true,
  autoActivate: false,
  activationAllowed: false,
  supplierLive: false,
  salesEnabled: false,
  publishEnabled: false,
  humanApprovalRequired: true,
});

const PRODUCT_STATES = ["DRAFT", "REVIEW", "APPROVED", "PUBLISHED"];

let _cachedTree = null;
let _index = null;

function loadTreeFromDisk() {
  if (_cachedTree) return _cachedTree;
  try {
    _cachedTree = JSON.parse(fs.readFileSync(TREE_FILE, "utf8"));
  } catch {
    _cachedTree = { root: null, nodes: [] };
  }
  return _cachedTree;
}

function buildIndex() {
  if (_index) return _index;
  const tree = loadTreeFromDisk();
  const byId = new Map();
  const bySlugPath = new Map();
  const childrenByParent = new Map();

  function walk(node, slugPath = []) {
    byId.set(node.id, node);
    const pathKey = slugPath.join("/");
    if (pathKey) bySlugPath.set(pathKey, node);
    const parentId = node.parentId || null;
    if (parentId) {
      const list = childrenByParent.get(parentId) || [];
      list.push(node);
      childrenByParent.set(parentId, list);
    }
    for (const child of node.children || []) {
      const nextPath =
        node.id === AUTOMOTIVE_ROOT_ID ? [child.slug] : [...slugPath, child.slug];
      walk(child, nextPath);
    }
  }

  if (tree.root) walk(tree.root, []);
  for (const node of tree.nodes || []) {
    if (!byId.has(node.id)) walk(node, node.slugPath ? node.slugPath.split("/") : [node.slug]);
  }

  for (const [, list] of childrenByParent) {
    list.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }

  _index = { byId, bySlugPath, childrenByParent, tree };
  return _index;
}

function invalidateCache() {
  _cachedTree = null;
  _index = null;
}

function getAutomotiveRoot() {
  const { tree } = buildIndex();
  return tree.root;
}

function getAutomotiveTaxonomy() {
  const { tree, byId } = buildIndex();
  return {
    root: tree.root,
    nodes: [...byId.values()],
    productStates: PRODUCT_STATES,
    safety: AUTOMOTIVE_SAFETY_POLICY,
  };
}

function getCategoryById(id) {
  return buildIndex().byId.get(id) || null;
}

function getCategoryBySlugPath(slugPath) {
  const normalized = String(slugPath || "").replace(/^\/+|\/+$/g, "");
  return buildIndex().bySlugPath.get(normalized) || null;
}

function getChildren(parentId) {
  return [...(buildIndex().childrenByParent.get(parentId) || [])];
}

function getSubcategories() {
  return getChildren(AUTOMOTIVE_ROOT_ID);
}

function flattenCategories() {
  const { byId } = buildIndex();
  return [...byId.values()].sort((a, b) => (a.level - b.level) || (a.sortOrder - b.sortOrder));
}

function getCategoryUrl(category) {
  if (!category) return "/products/automotive/";
  if (category.level === 1 || category.id === AUTOMOTIVE_ROOT_ID) {
    return "/products/automotive/";
  }
  const parts = ["automotive"];
  let current = category;
  const chain = [current];
  while (current.parentId && current.parentId !== AUTOMOTIVE_ROOT_ID) {
    const parent = getCategoryById(current.parentId);
    if (!parent) break;
    chain.unshift(parent);
    current = parent;
  }
  for (const node of chain) {
    if (node.id !== AUTOMOTIVE_ROOT_ID) parts.push(node.slug);
  }
  return `/products/${parts.join("/")}/`;
}

module.exports = {
  AUTOMOTIVE_ROOT_ID,
  AUTOMOTIVE_SAFETY_POLICY,
  PRODUCT_STATES,
  TREE_FILE,
  loadTreeFromDisk,
  invalidateCache,
  getAutomotiveRoot,
  getAutomotiveTaxonomy,
  getCategoryById,
  getCategoryBySlugPath,
  getChildren,
  getSubcategories,
  flattenCategories,
  getCategoryUrl,
};
