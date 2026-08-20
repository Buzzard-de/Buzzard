const fs = require("fs");
const path = require("path");

const dataDir = path.join(
  __dirname,
  "..",
  "..",
  "intelligence",
  "buzzard_ai_complete",
  "smart_menu_48_maximal",
  "data"
);
const taxonomyFile = path.join(dataDir, "taxonomy.json");

let taxonomyCache = null;

function loadTaxonomy() {
  if (!taxonomyCache) {
    taxonomyCache = JSON.parse(fs.readFileSync(taxonomyFile, "utf8"));
  }
  return taxonomyCache;
}

function mainCategories() {
  return loadTaxonomy().nodes.map((node) => ({
    id: node.id,
    name: node.name,
    slug: node.slug,
  }));
}

function getMain(mainId) {
  return loadTaxonomy().nodes.find((node) => node.id === mainId) || null;
}

function getSubcategory(subId) {
  for (const main of loadTaxonomy().nodes) {
    for (const sub of main.children) {
      if (sub.id === subId) {
        return { main, sub };
      }
    }
  }
  return null;
}

function getSignals(subId) {
  const match = getSubcategory(subId);
  if (!match) return null;
  return match.sub.signals || null;
}

function search(term, limit = 50) {
  const query = String(term || "").trim().toLowerCase();
  if (!query) return [];

  const results = [];
  for (const main of loadTaxonomy().nodes) {
    for (const sub of main.children) {
      for (const leaf of sub.children) {
        const haystack = `${main.name} ${sub.name} ${leaf.name}`.toLowerCase();
        if (haystack.includes(query)) {
          results.push({
            main: { id: main.id, name: main.name, slug: main.slug },
            sub: { id: sub.id, name: sub.name, slug: sub.slug },
            leaf: { id: leaf.id, name: leaf.name, slug: leaf.slug },
          });
          if (results.length >= limit) return results;
        }
      }
    }
  }
  return results;
}

function counts() {
  const nodes = loadTaxonomy().nodes;
  const subcategories = nodes.reduce((sum, main) => sum + main.children.length, 0);
  const subSubcategories = nodes.reduce(
    (sum, main) => sum + main.children.reduce((inner, sub) => inner + sub.children.length, 0),
    0
  );
  return {
    main_categories: nodes.length,
    subcategories,
    sub_subcategories: subSubcategories,
    total_nodes: nodes.length + subcategories + subSubcategories,
  };
}

function health() {
  return {
    status: "smart_menu_48_ready",
    mode: "embedded",
    ...counts(),
    taxonomy_file: taxonomyFile,
  };
}

module.exports = {
  loadTaxonomy,
  mainCategories,
  getMain,
  getSubcategory,
  getSignals,
  search,
  counts,
  health,
};
