const fs = require("fs");
const path = require("path");

const CODE_RE = /^bz\.\d{2}$/;

function flattenShop(nodes, acc = []) {
  for (const n of nodes || []) {
    acc.push(n);
    if (n.children) flattenShop(n.children, acc);
  }
  return acc;
}

function validateTaxonomy({ root = process.cwd() } = {}) {
  const master = JSON.parse(fs.readFileSync(path.join(root, "data/taxonomy/buzzard_master_50_main_categories.json"), "utf8"));
  const shop = JSON.parse(fs.readFileSync(path.join(root, "data/buzzard_categories.json"), "utf8"));
  const mapping = JSON.parse(fs.readFileSync(path.join(root, "data/taxonomy/master_shop_l1_mapping.json"), "utf8"));
  const issues = [];
  const codes = master.categories.map((c) => c.code);
  const dupCodes = codes.filter((c, i) => codes.indexOf(c) !== i);
  if (dupCodes.length) issues.push({ kind: "DUPLICATE_ID", ids: [...new Set(dupCodes)] });
  for (const c of master.categories) {
    if (!CODE_RE.test(c.code)) issues.push({ kind: "INVALID_CATEGORY_CODE", code: c.code });
  }
  const shopNodes = flattenShop(shop.categories);
  const shopIds = shopNodes.map((n) => n.id);
  const dupShop = shopIds.filter((c, i) => shopIds.indexOf(c) !== i);
  if (dupShop.length) issues.push({ kind: "DUPLICATE_SHOP_ID", ids: [...new Set(dupShop)] });
  const parents = new Set(shop.categories.map((c) => c.id));
  for (const n of shopNodes) {
    if (n.level > 1 && n.parent && !shopIds.includes(n.parent)) {
      issues.push({ kind: "MISSING_PARENT", id: n.id, parent: n.parent });
    }
  }
  const seenPath = new Set();
  function walk(id, stack) {
    if (stack.includes(id)) {
      issues.push({ kind: "CIRCULAR", cycle: [...stack, id] });
      return;
    }
    if (seenPath.has(id)) return;
    seenPath.add(id);
  }
  for (const n of shop.categories) walk(n.id, []);
  const mapShop = new Set((mapping.mappings || []).map((m) => m.shop_id));
  for (const l1 of shop.categories) {
    if (!mapShop.has(l1.id)) issues.push({ kind: "BROKEN_MAPPING", shop_id: l1.id });
  }
  const orphanProducts = [];
  return {
    ok: issues.filter((i) => i.kind !== "BROKEN_MAPPING").length === 0,
    master50: master.categories.length,
    issues,
    orphanProducts,
    translationsComplete: false,
    approvedReviewRows: false,
    mergedPr492: false,
  };
}

module.exports = { validateTaxonomy, CODE_RE };
