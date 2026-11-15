const fs = require("fs");
const path = require("path");
const { check } = require("../permissionEngine");

function loadMaster() {
  const p = path.join(process.cwd(), "data/taxonomy/buzzard_master_50_main_categories.json");
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function inspectTree({ actorId = "category_ai" } = {}) {
  if (!check(actorId, "CATEGORY_READ").ok) return { ok: false, code: "PERMISSION_DENIED" };
  const master = loadMaster();
  const cats = master.categories || [];
  const codes = cats.map((c) => c.code);
  const n49 = cats.find((c) => c.num === 49);
  const n50 = cats.find((c) => c.num === 50);
  return {
    ok: true,
    main_categories: master.main_categories,
    count: cats.length,
    retired: master.retired_codes,
    foodRestored: false,
    jewelryRestored: false,
    codes,
    bike: n49 ? { num: n49.num, code: n49.code, name: n49.name } : null,
    renewable: n50 ? { num: n50.num, code: n50.code, name: n50.name } : null,
    codesImmutable: true,
    liveMarketplaceMap: false,
  };
}

function suggestPlacement({ actorId = "category_ai", sku, hint } = {}) {
  if (!check(actorId, "CATEGORY_SUGGEST").ok) return { ok: false, code: "PERMISSION_DENIED" };
  const tree = inspectTree({ actorId });
  if (tree.retired && hint && tree.retired.includes(hint)) {
    return { ok: true, suggested: null, rejectedRetired: hint, applyLive: false };
  }
  const hit = (tree.codes || []).includes(hint) ? hint : null;
  return { ok: true, sku, suggested: hit, applyLive: false, missingAttributes: hit ? [] : ["category_code"] };
}

function restoreRetired() {
  return { ok: false, code: "CATEGORY_RETIRED_LOCKED" };
}

function renameCode() {
  return { ok: false, code: "CATEGORY_ID_LOCKED" };
}

module.exports = { inspectTree, suggestPlacement, restoreRetired, renameCode };
