const { buildMasterV2 } = require("./eu27SeedV2");

let cache = null;

function loadV2() {
  if (!cache) cache = Object.freeze(buildMasterV2());
  return cache;
}

function uniqueIdsV2() {
  const ids = loadV2().entities.map((e) => e.id);
  return { unique: new Set(ids).size === ids.length, count: ids.length };
}

function sourceVerified(entities) {
  return entities.filter((e) => String(e.reliability).startsWith("VERIFIED") || e.reliability === "SOURCE_VERIFIED");
}

function brandCompanySplit(entities) {
  const brands = new Map();
  for (const e of entities) {
    const key = String(e.brand).toLowerCase();
    if (!brands.has(key)) brands.set(key, []);
    brands.get(key).push(e.id);
  }
  return [...brands.entries()].filter(([, ids]) => ids.length > 1);
}

module.exports = { loadV2, uniqueIdsV2, sourceVerified, brandCompanySplit };
