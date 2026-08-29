/**
 * Part 8 — Legacy JSON catalog → PIM Core migration (dry-run only)
 */
const fs = require("fs");
const path = require("path");
const productCore = require("../pim/productCore");
const productIdentifiers = require("../pim/productIdentifiers");

const LEGACY_PATH = path.join(__dirname, "..", "..", "data", "buzzard_categories.json");

function loadLegacyCatalog() {
  if (!fs.existsSync(LEGACY_PATH)) {
    return { found: false, path: LEGACY_PATH, products: [] };
  }
  try {
    const raw = JSON.parse(fs.readFileSync(LEGACY_PATH, "utf8"));
    const products = [];
    function walk(node, categoryId) {
      if (node.products) {
        for (const p of node.products) {
          products.push({ ...p, legacyCategoryId: categoryId });
        }
      }
      if (node.children) {
        for (const c of node.children) walk(c, c.id || categoryId);
      }
    }
    if (raw.categories) {
      for (const cat of raw.categories) walk(cat, cat.id);
    } else if (Array.isArray(raw)) {
      for (const cat of raw) walk(cat, cat.id);
    }
    return { found: true, path: LEGACY_PATH, products, rawKeys: Object.keys(raw) };
  } catch (err) {
    return { found: true, path: LEGACY_PATH, error: err.message, products: [] };
  }
}

function mapLegacyToPim(legacyProduct) {
  return {
    sku: legacyProduct.sku || legacyProduct.id,
    title: legacyProduct.name || legacyProduct.title || "Legacy Product",
    ean: legacyProduct.ean || null,
    category: legacyProduct.category || legacyProduct.legacyCategoryId,
    price: Number(legacyProduct.price) || 0,
    source: "legacy_json",
  };
}

function runDryRunMigration() {
  const legacy = loadLegacyCatalog();
  const report = {
    dryRun: true,
    destructive: false,
    legacyPath: legacy.path,
    legacyFound: legacy.found,
    scanned: legacy.products?.length || 0,
    mapped: [],
    duplicates: [],
    errors: [],
    skipped: [],
  };

  if (!legacy.found || legacy.error) {
    report.errors.push(legacy.error || "Legacy catalog file not found");
    return report;
  }

  for (const lp of legacy.products) {
    const mapped = mapLegacyToPim(lp);
    if (!mapped.sku) {
      report.skipped.push({ reason: "missing_sku", legacy: lp });
      continue;
    }

    const dup = productIdentifiers.findDuplicate("sku", mapped.sku);
    if (dup) {
      report.duplicates.push({ sku: mapped.sku, existingId: dup.id || dup.sku });
      continue;
    }

    report.mapped.push({
      sku: mapped.sku,
      title: mapped.title,
      category: mapped.category,
      wouldCreate: true,
    });
  }

  report.summary = {
    wouldImport: report.mapped.length,
    duplicates: report.duplicates.length,
    skipped: report.skipped.length,
  };

  return report;
}

module.exports = {
  loadLegacyCatalog,
  mapLegacyToPim,
  runDryRunMigration,
  LEGACY_PATH,
};
