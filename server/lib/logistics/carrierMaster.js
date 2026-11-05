/**
 * Carrier master database. Versioned snapshot. No live labels.
 */
const { buildMaster } = require("./eu27Seed");

let cache = null;

function load() {
  if (!cache) cache = Object.freeze(buildMaster());
  return cache;
}

function listCountries() {
  return load().countries;
}

function getEntity(id) {
  return load().entities.find((e) => e.id === id) || null;
}

function uniqueIds() {
  const ids = load().entities.map((e) => e.id);
  return { unique: new Set(ids).size === ids.length, count: ids.length };
}

function verifiedUniques() {
  return load().entities.filter((e) => String(e.reliability).startsWith("VERIFIED"));
}

module.exports = { load, listCountries, getEntity, uniqueIds, verifiedUniques };
