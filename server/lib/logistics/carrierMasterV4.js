const { buildMasterV4 } = require("./eu27SeedV4");

let cache = null;

function loadV4() {
  if (!cache) cache = Object.freeze(buildMasterV4());
  return cache;
}

function uniqueIdsV4() {
  const ids = loadV4().entities.map((e) => e.id);
  return { unique: new Set(ids).size === ids.length, count: ids.length };
}

function sourceVerified(entities) {
  return entities.filter((e) => String(e.reliability).startsWith("VERIFIED") || e.reliability === "SOURCE_VERIFIED");
}

module.exports = { loadV4, uniqueIdsV4, sourceVerified };
