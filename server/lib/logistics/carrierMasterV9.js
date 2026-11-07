const { buildMasterV9 } = require("./eu27SeedV9");

let cache = null;

function loadV9() {
  if (!cache) cache = Object.freeze(buildMasterV9());
  return cache;
}

function uniqueIdsV9() {
  const ids = loadV9().entities.map((e) => e.id);
  return { unique: new Set(ids).size === ids.length, count: ids.length };
}

module.exports = { loadV9, uniqueIdsV9 };
