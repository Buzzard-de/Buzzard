const fs = require("fs");
const path = require("path");
const { SHOP_L1_ID } = require("./constants");

const DEFAULT_TAXONOMY_PATH = path.join(__dirname, "data", "taxonomy.json");

function loadTaxonomyDocument(filePath = DEFAULT_TAXONOMY_PATH) {
  const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return raw;
}

function validateTaxonomy(document) {
  const issues = [];
  const categories = Array.isArray(document?.categories) ? document.categories : [];
  const byId = new Map();
  const slugByParent = new Map();

  if (document?.shopCategoryId && document.shopCategoryId !== SHOP_L1_ID) {
    issues.push({ code: "shop_l1_mismatch", message: "Taxonomy shopCategoryId must remain cat-55" });
  }

  for (const category of categories) {
    if (!category?.id || !/^cme-cat-[a-z0-9-]+$/.test(category.id)) {
      issues.push({ code: "invalid_id", id: category?.id });
      continue;
    }
    if (byId.has(category.id)) {
      issues.push({ code: "duplicate_id", id: category.id });
      continue;
    }
    byId.set(category.id, category);
    const parentKey = category.parentId || "__root__";
    const slugKey = `${parentKey}:${category.slug}`;
    if (slugByParent.has(slugKey)) {
      issues.push({ code: "duplicate_slug", id: category.id, slug: category.slug });
    } else {
      slugByParent.set(slugKey, category.id);
    }
    if (!category.names || !category.names.de || !category.names.en) {
      issues.push({ code: "missing_names", id: category.id });
    }
  }

  for (const category of byId.values()) {
    if (category.parentId && !byId.has(category.parentId)) {
      issues.push({ code: "missing_parent", id: category.id, parentId: category.parentId });
    }
  }

  const visiting = new Set();
  const visited = new Set();
  function walk(id) {
    if (visited.has(id)) return;
    if (visiting.has(id)) {
      issues.push({ code: "circular", id });
      return;
    }
    visiting.add(id);
    const node = byId.get(id);
    if (node?.parentId) walk(node.parentId);
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of byId.keys()) walk(id);

  return { ok: issues.length === 0, issues, count: byId.size };
}

function createTaxonomy(document = loadTaxonomyDocument()) {
  const validation = validateTaxonomy(document);
  const byId = new Map((document.categories || []).map((category) => [category.id, category]));

  function ancestors(id) {
    const chain = [];
    const seen = new Set();
    let current = byId.get(id);
    while (current?.parentId && !seen.has(current.parentId)) {
      seen.add(current.parentId);
      const parent = byId.get(current.parentId);
      if (!parent) break;
      chain.push(parent);
      current = parent;
    }
    return chain;
  }

  function children(id) {
    return [...byId.values()].filter((category) => category.parentId === id);
  }

  function localize(category, language = "de") {
    const lang = String(language || "de").slice(0, 2);
    return category.names[lang] || category.names.en || category.names.de;
  }

  function findByAlias(query, language = "de") {
    const q = String(query || "").trim().toLowerCase();
    if (!q) return [];
    return [...byId.values()].filter((category) => {
      const labels = [
        localize(category, language),
        ...Object.values(category.names || {}),
        ...(category.synonyms || []),
        category.slug,
      ];
      return labels.some((label) => String(label).toLowerCase().includes(q));
    });
  }

  function get(id) {
    return byId.get(id) || null;
  }

  function list() {
    return [...byId.values()];
  }

  return {
    document,
    validation,
    get,
    list,
    children,
    ancestors,
    localize,
    findByAlias,
    shopCategoryId: document.shopCategoryId || SHOP_L1_ID,
  };
}

module.exports = {
  loadTaxonomyDocument,
  validateTaxonomy,
  createTaxonomy,
};
