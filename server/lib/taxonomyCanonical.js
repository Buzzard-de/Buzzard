/**
 * Part 12 — Authoritative 53-category shop taxonomy + legacy 48 compatibility
 * Source of truth: data/buzzard_categories.json
 */
const fs = require("fs");
const path = require("path");

const CANONICAL_FILE = path.join(__dirname, "..", "..", "data", "buzzard_categories.json");
const LEGACY_48_NOTE = "smart_menu_48 engine uses 48 L1 codes — map via compatibility layer";

/** Legacy 48 → canonical 53 slug aliases (subset; extend as needed) */
const LEGACY_48_TO_53 = {
  auto_motorrad: "auto-und-motorrad",
  bau_garten: "bau-und-garten",
  beauty_gesundheit: "beauty-und-gesundheit",
  computer_tablets: "computer-und-tablets",
  haushalt_wohnen: "haushalt-und-wohnen",
  mode_accessoires: "mode-und-accessoires",
  sport_freizeit: "sport-und-freizeit",
  tierbedarf: "tierbedarf",
};

function loadCanonicalTaxonomy() {
  try {
    const doc = JSON.parse(fs.readFileSync(CANONICAL_FILE, "utf8"));
    const categories = doc.categories || doc.main_categories || [];
    return {
      version: doc.version || "53",
      mainCategoryCount: doc.main_category_count || categories.length,
      categories,
      source: CANONICAL_FILE,
      authoritative: true,
    };
  } catch (err) {
    return {
      version: "53",
      mainCategoryCount: 0,
      categories: [],
      source: CANONICAL_FILE,
      authoritative: true,
      error: err.message,
    };
  }
}

function resolveCanonicalCategoryId(idOrSlug) {
  if (!idOrSlug) return null;
  const key = String(idOrSlug).trim();
  const mapped = LEGACY_48_TO_53[key] || LEGACY_48_TO_53[key.replace(/-/g, "_")] || key;
  const { categories } = loadCanonicalTaxonomy();

  function walk(nodes) {
    for (const node of nodes) {
      if (node.id === mapped || node.slug === mapped || node.id === key || node.slug === key) {
        return node;
      }
      if (node.children?.length) {
        const found = walk(node.children);
        if (found) return found;
      }
    }
    return null;
  }

  return walk(categories);
}

function getTaxonomyMeta() {
  const canonical = loadCanonicalTaxonomy();
  return {
    canonical: {
      count: canonical.mainCategoryCount,
      source: "data/buzzard_categories.json",
      authoritative: true,
    },
    legacy48: {
      engine: "smart_menu_48",
      count: 48,
      status: "COMPATIBILITY",
      note: LEGACY_48_NOTE,
    },
  };
}

function validateCanonicalTaxonomy() {
  const canonical = loadCanonicalTaxonomy();
  const issues = [];
  if (canonical.mainCategoryCount !== 53) {
    issues.push(`expected 53 L1 categories, got ${canonical.mainCategoryCount}`);
  }
  const slugs = new Set();
  for (const cat of canonical.categories) {
    if (cat.slug && slugs.has(cat.slug)) issues.push(`duplicate slug: ${cat.slug}`);
    if (cat.slug) slugs.add(cat.slug);
  }
  return { ok: issues.length === 0, count: canonical.mainCategoryCount, issues };
}

module.exports = {
  CANONICAL_FILE,
  LEGACY_48_TO_53,
  loadCanonicalTaxonomy,
  resolveCanonicalCategoryId,
  getTaxonomyMeta,
  validateCanonicalTaxonomy,
};
