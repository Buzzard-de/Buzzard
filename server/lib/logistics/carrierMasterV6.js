const { buildMasterV6 } = require("./eu27SeedV6");

let cache = null;

function loadV6() {
  if (!cache) cache = Object.freeze(buildMasterV6());
  return cache;
}

function uniqueIdsV6() {
  const ids = loadV6().entities.map((e) => e.id);
  return { unique: new Set(ids).size === ids.length, count: ids.length };
}

module.exports = { loadV6, uniqueIdsV6 };
