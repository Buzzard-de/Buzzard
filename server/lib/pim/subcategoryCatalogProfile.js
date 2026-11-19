/**
 * Subcategory attribute + filter profiles (L1 template + optional L2 overrides).
 * Reads taxonomy JSON only — no live supplier calls, no PIM writes.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..", "..");
const SHOP_FILE = path.join(ROOT, "data", "buzzard_categories.json");
const TEMPLATE_FILE = path.join(ROOT, "data", "taxonomy", "l1_catalog_filter_templates.v1.json");
const RETIRED_FILE = path.join(ROOT, "data", "taxonomy", "retired_shop_l1.json");

let shopCache = null;
let templateCache = null;

function loadTemplates() {
  if (templateCache) return templateCache;
  templateCache = JSON.parse(fs.readFileSync(TEMPLATE_FILE, "utf8"));
  return templateCache;
}

function loadShopIndex() {
  if (shopCache) return shopCache;
  const shop = JSON.parse(fs.readFileSync(SHOP_FILE, "utf8"));
  const retiredDoc = JSON.parse(fs.readFileSync(RETIRED_FILE, "utf8"));
  const retiredShop = new Set((retiredDoc.retired || []).map((row) => row.shop_id));
  const byId = new Map();
  const bySlug = new Map();
  const l2 = [];

  function visit(node, root, depth) {
    const record = {
      id: node.id,
      slug: node.slug,
      name: node.name,
      level: depth,
      rootId: root.id,
      rootSlug: root.slug,
      retired: retiredShop.has(root.id) || retiredShop.has(node.id),
    };
    byId.set(String(node.id).toLowerCase(), record);
    bySlug.set(String(node.slug).toLowerCase(), record);
    if (depth === 2 && !record.retired) l2.push(record);
    for (const child of node.children || []) visit(child, root, depth + 1);
  }

  for (const root of shop.categories || []) {
    if (retiredShop.has(root.id)) continue;
    visit(root, root, 1);
  }

  shopCache = { byId, bySlug, l2, activeL1: [...new Set(l2.map((r) => r.rootId))] };
  return shopCache;
}

function resolveProfile({ subcategoryId, subcategorySlug, rootSlug } = {}) {
  const templates = loadTemplates();
  const index = loadShopIndex();
  let meta = null;
  if (subcategoryId) meta = index.byId.get(String(subcategoryId).toLowerCase());
  if (!meta && subcategorySlug) meta = index.bySlug.get(String(subcategorySlug).toLowerCase());
  if (!meta && rootSlug) {
    const root = [...index.byId.values()].find((r) => r.rootSlug === rootSlug && r.id === r.rootId);
    meta = root || null;
  }
  const rootSlugResolved = meta?.rootSlug || rootSlug || null;
  const base =
    (meta?.rootId && templates.byL1Id?.[meta.rootId]) ||
    (rootSlugResolved && templates.templates?.[rootSlugResolved]) ||
    null;
  if (!base) {
    return {
      ok: false,
      code: "PROFILE_MISSING",
      filters: [],
      attributes: [],
      subcategoryId: meta?.id || subcategoryId || null,
    };
  }
  const override = meta?.id ? templates.overrides?.[meta.id] : null;
  const mergedAttrs = [...(base.attributes || []), ...(override?.attributes || [])];
  const seen = new Set();
  const attributes = mergedAttrs.filter((row) => {
    const key = row.key;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const filters = [...new Set([...(base.filters || []), ...(override?.filters || [])])];
  return {
    ok: true,
    code: "PROFILE_RESOLVED",
    subcategoryId: meta?.id || subcategoryId || null,
    rootSlug: rootSlugResolved,
    filters,
    attributes,
    requiredAttributes: attributes.filter((a) => a.required === true).map((a) => a.key),
    filterAttributes: attributes.filter((a) => a.filter === true).map((a) => a.key),
  };
}

function validateCatalogCoverage() {
  const templates = loadTemplates();
  const index = loadShopIndex();
  const missingL1 = [];
  for (const l1Id of index.activeL1) {
    if (!templates.byL1Id?.[l1Id]) missingL1.push(l1Id);
  }
  const missingL2 = [];
  for (const row of index.l2) {
    const profile = resolveProfile({ subcategoryId: row.id });
    if (!profile.ok || !profile.filters.length || !profile.attributes.length) {
      missingL2.push(row.id);
    }
  }
  return {
    ok: missingL1.length === 0 && missingL2.length === 0,
    activeL1: index.activeL1.length,
    l2Count: index.l2.length,
    templateL1: Object.keys(templates.templates || {}).length,
    missingL1,
    missingL2: missingL2.slice(0, 20),
    missingL2Total: missingL2.length,
  };
}

function validateProductAttributes(product, profile) {
  if (!profile?.ok) return { ok: false, code: "PROFILE_MISSING", missing: profile?.requiredAttributes || [] };
  const attrs = product?.attributes || {};
  const missing = (profile.requiredAttributes || []).filter((key) => {
    const val = attrs[key];
    return val == null || String(val).trim() === "";
  });
  return missing.length ? { ok: false, code: "ATTRIBUTE_REQUIRED", missing } : { ok: true, code: "ATTRIBUTE_OK" };
}

function enrichFacets(facets, items, profile) {
  if (!profile?.ok) return facets;
  const attributeFacets = {};
  for (const key of profile.filterAttributes || []) {
    const counts = new Map();
    for (const item of items) {
      const val = item.attributes?.[key];
      if (val == null || val === "") continue;
      const s = String(val);
      counts.set(s, (counts.get(s) || 0) + 1);
    }
    if (counts.size) {
      attributeFacets[key] = [...counts.entries()].map(([value, count]) => ({ value, count }));
    }
  }
  return {
    ...facets,
    subcategoryId: profile.subcategoryId || null,
    attributeFacets,
    filterKeys: profile.filters,
  };
}

module.exports = {
  loadTemplates,
  resolveProfile,
  validateCatalogCoverage,
  validateProductAttributes,
  enrichFacets,
};