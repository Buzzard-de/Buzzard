const { buildMasterV7 } = require("./eu27SeedV7");

let cache = null;

function loadV7() {
  if (!cache) cache = Object.freeze(buildMasterV7());
  return cache;
}

function uniqueIdsV7() {
  const ids = loadV7().entities.map((e) => e.id);
  return { unique: new Set(ids).size === ids.length, count: ids.length };
}

module.exports = { loadV7, uniqueIdsV7 };
