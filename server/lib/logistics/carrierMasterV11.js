const { buildMasterV11 } = require("./eu27SeedV11");

let cache = null;

function loadV11() {
  if (!cache) cache = Object.freeze(buildMasterV11());
  return cache;
}

function uniqueIdsV11() {
  const ids = loadV11().entities.map((e) => e.id);
  return { unique: new Set(ids).size === ids.length, count: ids.length };
}

module.exports = { loadV11, uniqueIdsV11 };
