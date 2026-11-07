const { buildMasterV10 } = require("./eu27SeedV10");

let cache = null;

function loadV10() {
  if (!cache) cache = Object.freeze(buildMasterV10());
  return cache;
}

function uniqueIdsV10() {
  const ids = loadV10().entities.map((e) => e.id);
  return { unique: new Set(ids).size === ids.length, count: ids.length };
}

module.exports = { loadV10, uniqueIdsV10 };
