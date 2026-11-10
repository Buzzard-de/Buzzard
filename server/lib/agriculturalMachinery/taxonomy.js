const document = require("./data/taxonomy");
const { SHOP_L1_ID } = require("./constants");

function validateTaxonomy(doc = document) {
  const issues = [];
  const categories = Array.isArray(doc?.categories) ? doc.categories : [];
  const byId = new Map();
  const slugByParent = new Map();

  if (doc?.shopCategoryId && doc.shopCategoryId !== SHOP_L1_ID) {
    issues.push({ code: "shop_l1_mismatch", message: "Agricultural taxonomy shopCategoryId must remain cat-20" });
  }
  for (const category of categories) {
    if (!category?.id || !/^ame-cat-[a-z0-9-]+$/.test(category.id)) {
      issues.push({ code: "invalid_id", id: category?.id });
      continue;
    }
    if (String(category.id).startsWith("cme-cat-")) {
      issues.push({ code: "construction_id_leak", id: category.id });
    }
    if (byId.has(category.id)) {
      issues.push({ code: "duplicate_id", id: category.id });
      continue;
    }
    byId.set(category.id, category);
    const slugKey = `${category.parentId || "__root__"}:${category.slug}`;
    if (slugByParent.has(slugKey)) issues.push({ code: "duplicate_slug", id: category.id });
    else slugByParent.set(slugKey, category.id);
    if (!category.names?.de || !category.names?.en) issues.push({ code: "missing_names", id: category.id });
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

function createTaxonomy(doc = document) {
  const validation = validateTaxonomy(doc);
  const byId = new Map((doc.categories || []).map((category) => [category.id, category]));

  function localize(category, language = "de") {
    const lang = String(language || "de").slice(0, 2);
    return category.names[lang] || category.names.en || category.names.de;
  }

  function findByAlias(query, language = "de") {
    const q = String(query || "").trim().toLowerCase();
    if (!q) return [];
    return [...byId.values()].filter((category) => {
      const labels = [localize(category, language), ...Object.values(category.names || {}), ...(category.synonyms || []), category.slug];
      return labels.some((label) => String(label).toLowerCase().includes(q));
    });
  }

  return {
    document: doc,
    validation,
    get: (id) => byId.get(id) || null,
    list: () => [...byId.values()],
    children: (id) => [...byId.values()].filter((category) => category.parentId === id),
    localize,
    findByAlias,
    shopCategoryId: doc.shopCategoryId || SHOP_L1_ID,
    domain: "agricultural",
  };
}

module.exports = { validateTaxonomy, createTaxonomy, document };
