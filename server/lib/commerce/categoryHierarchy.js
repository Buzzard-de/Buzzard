/**
 * Hierarchy checks for the existing 50-category master file.
 * Official subcategory rows are not invented. Missing children stay TAXONOMY_DATA_REQUIRED.
 */
const fs = require("fs");
const path = require("path");

function loadMaster(root = process.cwd()) {
  const file = path.join(root, "data/taxonomy/buzzard_master_50_main_categories.json");
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function validateNodes(nodes = []) {
  const ids = [];
  const duplicates = [];
  const seen = new Set();
  const byId = new Map();
  for (const node of nodes) {
    if (seen.has(node.id)) duplicates.push(node.id);
    seen.add(node.id);
    ids.push(node.id);
    byId.set(node.id, node);
  }
  const invalidParents = [];
  for (const node of nodes) {
    if (node.parent != null && !byId.has(node.parent)) invalidParents.push(node.id);
  }
  const cycles = [];
  for (const node of nodes) {
    const walk = new Set();
    let current = node;
    while (current && current.parent) {
      if (walk.has(current.id)) {
        cycles.push(node.id);
        break;
      }
      walk.add(current.id);
      current = byId.get(current.parent);
    }
  }
  return {
    ok: duplicates.length === 0 && invalidParents.length === 0 && cycles.length === 0,
    duplicates,
    invalidParents,
    cycles,
    count: nodes.length,
  };
}

function validateHierarchy({ root = process.cwd() } = {}) {
  const master = loadMaster(root);
  const categories = master.categories || [];
  const retired = master.retired_codes || [];
  const nodes = categories.map((category) => ({
    id: category.code,
    parent: null,
    name: category.name,
    slug: category.slug,
    num: category.num,
  }));
  const shape = validateNodes(nodes);
  const active = nodes.filter((node) => !retired.includes(node.id));
  const retiredInsideActive = active.filter((node) => retired.includes(node.id)).map((node) => node.id);
  return {
    ok: shape.ok && categories.length === 50 && shape.duplicates.length === 0 && retired.includes("bz.20") && retiredInsideActive.length === 0 && !active.some((node) => node.id === "bz.20"),
    count: categories.length,
    active: active.length,
    retired,
    officialChildren: 0,
    subcategoryStatus: "TAXONOMY_DATA_REQUIRED",
    cycles: shape.cycles.length,
    duplicates: shape.duplicates,
    invalidParents: shape.invalidParents,
    idsStable: true,
    synthetic: false,
    locale: master.locale || "de",
    categoryNameLocales: [master.locale || "de"],
    categoryNameStatus: "TAXONOMY_DATA_REQUIRED",
    orphans: shape.invalidParents,
  };
}

function breadcrumb(code, { root = process.cwd() } = {}) {
  const master = loadMaster(root);
  const retired = master.retired_codes || [];
  if (retired.includes(code)) return { ok: false, code: "RETIRED_CATEGORY", crumbs: [], children: [] };
  const category = (master.categories || []).find((row) => row.code === code);
  if (!category) return { ok: false, code: "UNKNOWN_CATEGORY", crumbs: [], children: [] };
  return {
    ok: true,
    crumbs: [{ code: category.code, name: category.name, parent: null }],
    children: [],
    childStatus: "TAXONOMY_DATA_REQUIRED",
    synthetic: false,
  };
}

module.exports = { loadMaster, validateNodes, validateHierarchy, breadcrumb };
