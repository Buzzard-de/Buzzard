/**
 * Category expert memories bound to the 48-node master tree (preserved).
 */
const fs = require("fs");
const path = require("path");
const { createMemoryStore } = require("./memory");
const { MEMBERS } = require("./council");

function loadMasterTree() {
  const file = path.join(__dirname, "..", "..", "..", "data", "taxonomy", "buzzard_master_48_main_categories_de.json");
  const json = JSON.parse(fs.readFileSync(file, "utf8"));
  return json.categories || [];
}

function createCategoryExperts() {
  const tree = loadMasterTree();
  const memory = createMemoryStore();
  const experts = MEMBERS.filter((m) => m.role === "category_expert");

  function expertForCode(code) {
    return experts.find((e) => e.categoryCode === code) || null;
  }

  function remember({ expertId, key, value }) {
    const expert = MEMBERS.find((m) => m.id === expertId && m.role === "category_expert");
    if (!expert) return { ok: false, code: "UNKNOWN_EXPERT" };
    return { ok: true, entry: memory.putPersonal(expertId, { key, value }) };
  }

  return {
    treeCount: tree.length,
    treePreserved: tree.length === 48,
    experts,
    expertForCode,
    remember,
    memory,
    codes: tree.map((c) => c.code),
  };
}

module.exports = { createCategoryExperts, loadMasterTree };
