const { buildMasterV5 } = require("./eu27SeedV5");

let cache = null;

function loadV5() {
  if (!cache) cache = Object.freeze(buildMasterV5());
  return cache;
}

function uniqueIdsV5() {
  const ids = loadV5().entities.map((e) => e.id);
  return { unique: new Set(ids).size === ids.length, count: ids.length };
}

function sourceVerified(entities) {
  return entities.filter((e) => String(e.reliability).startsWith("VERIFIED") || e.reliability === "SOURCE_VERIFIED");
}

module.exports = { loadV5, uniqueIdsV5, sourceVerified };
