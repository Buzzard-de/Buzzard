const document = require("./data/taxonomy");
const { SHOP_L1_ID } = require("./constants");

function validateTaxonomy(doc = document) {
  const issues = [];
  const byId = new Map();
  for (const category of doc.categories || []) {
    if (!/^vpe-cat-[a-z0-9-]+$/.test(category.id || "")) {
      issues.push({ code: "invalid_id", id: category.id });
      continue;
    }
    if (category.id.startsWith("ame-cat-") || category.id.startsWith("cme-cat-")) {
      issues.push({ code: "foreign_taxonomy_leak", id: category.id });
    }
    if (byId.has(category.id)) issues.push({ code: "duplicate_id", id: category.id });
    else byId.set(category.id, category);
    if (!category.names?.de || !category.names?.en) issues.push({ code: "missing_names", id: category.id });
  }
  for (const category of byId.values()) {
    if (category.parentId && !byId.has(category.parentId)) {
      issues.push({ code: "missing_parent", id: category.id });
    }
  }
  if (doc.shopCategoryId !== SHOP_L1_ID) issues.push({ code: "shop_l1_mismatch" });
  return { ok: issues.length === 0, issues, count: byId.size };
}

function createTaxonomy(doc = document) {
  const validation = validateTaxonomy(doc);
  const byId = new Map((doc.categories || []).map((category) => [category.id, category]));
  return {
    document: doc,
    validation,
    domain: "automotive",
    shopCategoryId: SHOP_L1_ID,
    get: (id) => byId.get(id) || null,
    list: () => [...byId.values()],
    children: (id) => [...byId.values()].filter((category) => category.parentId === id),
    localize(category, language = "de") {
      const lang = String(language || "de").slice(0, 2);
      return category.names[lang] || category.names.en;
    },
    findByAlias(query) {
      const q = String(query || "").toLowerCase();
      if (!q) return [];
      return [...byId.values()].filter((category) =>
        [category.slug, ...Object.values(category.names || {}), ...(category.synonyms || [])].some((label) =>
          String(label).toLowerCase().includes(q)
        )
      );
    },
    forVehicleClass(vehicleClass) {
      return [...byId.values()].filter((category) => !vehicleClass || (category.vehicleClasses || []).includes(vehicleClass));
    },
  };
}

module.exports = { validateTaxonomy, createTaxonomy, document };
