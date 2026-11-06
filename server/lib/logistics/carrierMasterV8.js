const { buildMasterV8 } = require("./eu27SeedV8");

let cache = null;

function loadV8() {
  if (!cache) cache = Object.freeze(buildMasterV8());
  return cache;
}

function uniqueIdsV8() {
  const ids = loadV8().entities.map((e) => e.id);
  return { unique: new Set(ids).size === ids.length, count: ids.length };
}

module.exports = { loadV8, uniqueIdsV8 };
