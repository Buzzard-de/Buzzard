const { buildMasterV3 } = require("./eu27SeedV3");

let cache = null;

function loadV3() {
  if (!cache) cache = Object.freeze(buildMasterV3());
  return cache;
}

function uniqueIdsV3() {
  const ids = loadV3().entities.map((e) => e.id);
  return { unique: new Set(ids).size === ids.length, count: ids.length };
}

function sourceVerified(entities) {
  return entities.filter((e) => String(e.reliability).startsWith("VERIFIED") || e.reliability === "SOURCE_VERIFIED");
}

module.exports = { loadV3, uniqueIdsV3, sourceVerified };
