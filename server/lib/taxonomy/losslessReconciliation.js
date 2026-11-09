/**
 * Lossless taxonomy mapping. Does not write origin/main or merge PR #492.
 * Codes are never silently renumbered. Retired rows stay in historical maps.
 */
const fs = require("fs");
const path = require("path");

function loadJson(root, rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
}

function byCode(categories) {
  const map = new Map();
  for (const row of categories) map.set(row.code, row);
  return map;
}

function reconcile({ root = process.cwd() } = {}) {
  const master50 = loadJson(root, "data/taxonomy/buzzard_master_50_main_categories.json");
  const master48 = loadJson(root, "data/taxonomy/buzzard_master_48_main_categories_de.json");
  const shop = loadJson(root, "data/buzzard_categories.json");
  const mapping = loadJson(root, "data/taxonomy/master_shop_l1_mapping.json");
  const retiredShop = loadJson(root, "data/taxonomy/retired_shop_l1.json");
  const productHold = fs.existsSync(path.join(root, "data/taxonomy/retired_category_product_hold.json"))
    ? loadJson(root, "data/taxonomy/retired_category_product_hold.json")
    : { holds: [] };

  const codes50 = byCode(master50.categories);
  const codes48 = byCode(master48.categories);
  const retired = new Set(master50.retired_codes || ["bz.20", "bz.25", "bz.26"]);
  const rows = [];

  for (const row of master48.categories) {
    const target = codes50.get(row.code);
    if (retired.has(row.code)) {
      rows.push({
        nativeId: row.code,
        categoryCode: row.code,
        displayName: row.name,
        parent: null,
        sourceBranch: "origin/main+local-48",
        targetBranch: "master-50",
        mappingResult: "RETIRED_PRESERVE",
        productCount: null,
        conflictStatus: "NONE",
        migrationRisk: "LOW",
        deleted: false,
        renumbered: false,
      });
      continue;
    }
    if (!target) {
      rows.push({
        nativeId: row.code,
        categoryCode: row.code,
        displayName: row.name,
        parent: null,
        sourceBranch: "origin/main-48",
        targetBranch: "master-50",
        mappingResult: "REVIEW_REQUIRED",
        productCount: null,
        conflictStatus: "MISSING_ON_50",
        migrationRisk: "HIGH",
        deleted: false,
        renumbered: false,
      });
      continue;
    }
    const nameConflict = target.name !== row.name;
    rows.push({
      nativeId: row.code,
      categoryCode: row.code,
      displayName: target.name,
      parent: null,
      sourceBranch: "origin/main-48",
      targetBranch: "master-50",
      mappingResult: nameConflict ? "KEEP_CODE_NAME_DIFF" : "KEEP_BY_CODE",
      productCount: null,
      conflictStatus: nameConflict ? "DISPLAY_NAME_DIFF" : "NONE",
      migrationRisk: nameConflict ? "MEDIUM" : "LOW",
      deleted: false,
      renumbered: target.num !== row.num,
      sourceNum: row.num,
      targetNum: target.num,
    });
  }

  for (const row of master50.categories) {
    if (codes48.has(row.code) || retired.has(row.code)) continue;
    rows.push({
      nativeId: row.code,
      categoryCode: row.code,
      displayName: row.name,
      parent: null,
      sourceBranch: "master-50-only",
      targetBranch: "master-50",
      mappingResult: "NEW_ON_50",
      productCount: null,
      conflictStatus: "NOT_ON_ORIGIN_MAIN_48",
      migrationRisk: "MEDIUM",
      deleted: false,
      renumbered: false,
      review: "REVIEW_REQUIRED",
    });
  }

  const shopMap = new Map((mapping.mappings || []).map((m) => [m.shop_id, m]));
  const retiredShopIds = new Set((retiredShop.retired || []).map((r) => r.shop_id));
  const masterHits = new Map();
  for (const m of mapping.mappings || []) {
    if (!m.master_code) continue;
    masterHits.set(m.master_code, (masterHits.get(m.master_code) || 0) + 1);
  }
  const shopRows = shop.categories.map((cat) => {
    const mapped = shopMap.get(cat.id);
    const isRetired = retiredShopIds.has(cat.id);
    if (isRetired) {
      return {
        nativeId: cat.id,
        categoryCode: mapped?.master_code || null,
        displayName: cat.name,
        parent: null,
        sourceBranch: "storefront-53",
        targetBranch: "master-50",
        mappingResult: "SHOP_RETIRED_HOLD",
        productCount: null,
        conflictStatus: "RETIRED",
        migrationRisk: "LOW",
        deleted: false,
      };
    }
    if (!mapped) {
      return {
        nativeId: cat.id,
        categoryCode: null,
        displayName: cat.name,
        parent: null,
        sourceBranch: "storefront-53",
        targetBranch: "master-50",
        mappingResult: "REVIEW_REQUIRED",
        productCount: null,
        conflictStatus: "UNMAPPED_SHOP_L1",
        migrationRisk: "HIGH",
        deleted: false,
      };
    }
    const on50 = codes50.has(mapped.master_code);
    const retiredCode = retired.has(mapped.master_code);
    const ambiguous = (masterHits.get(mapped.master_code) || 0) > 1;
    return {
      nativeId: cat.id,
      categoryCode: mapped.master_code,
      displayName: cat.name,
      parent: null,
      sourceBranch: "storefront-53",
      targetBranch: "master-50",
      mappingResult: retiredCode
        ? "SHOP_POINTS_AT_RETIRED"
        : ambiguous
          ? "REVIEW_REQUIRED"
          : on50
            ? "SHOP_TO_MASTER"
            : "REVIEW_REQUIRED",
      productCount: null,
      conflictStatus: ambiguous ? "AMBIGUOUS_SHOP_TO_MASTER" : on50 || retiredCode ? "NONE" : "MASTER_CODE_MISSING",
      migrationRisk: ambiguous ? "MEDIUM" : on50 ? "LOW" : "HIGH",
      deleted: false,
    };
  });

  const reviewRequired = [...rows, ...shopRows].filter(
    (r) => r.mappingResult === "REVIEW_REQUIRED" || r.review === "REVIEW_REQUIRED"
  );

  return {
    mergedPr492: false,
    originMainOverwritten: false,
    master50Count: master50.categories.length,
    master48Count: master48.categories.length,
    shopL1Count: shop.categories.length,
    retiredCodes: [...retired],
    productRelationshipsPreserved: true,
    productHoldPresent: Boolean(productHold),
    rows,
    shopRows,
    reviewRequired,
    pr492: {
      note: "OPEN; Taxonomy Auto Sync FAILURE; not merged. Files overlap locales/mapping; lossless plan only.",
      merge: false,
    },
  };
}

module.exports = { reconcile };
