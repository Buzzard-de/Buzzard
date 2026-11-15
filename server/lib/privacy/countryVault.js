/**
 * Per-country file isolation. Cross-country read/write is denied.
 */
const { AB27 } = require("../commerce/ab27Tax");

const vaults = Object.fromEntries(AB27.map((code) => [code, new Map()]));

function countryKey(country) {
  const code = String(country || "").toUpperCase();
  return code === "GR" ? "EL" : code;
}

function resetVaults() {
  for (const code of AB27) vaults[code] = new Map();
}

function put({ country, actorCountry, key, value } = {}) {
  const dest = countryKey(country);
  const actor = countryKey(actorCountry || country);
  if (!vaults[dest]) return { ok: false, code: "UNKNOWN_COUNTRY" };
  if (actor !== dest) {
    const esat = require("../security/esatBey").inspect({
      type: "COUNTRY_CROSS_SHARE",
      details: { dest, actor, key },
      actor: "country_vault",
    });
    return { ok: false, code: "COUNTRY_ISOLATION", esat };
  }
  vaults[dest].set(String(key), { value, at: new Date().toISOString() });
  return { ok: true, country: dest, key };
}

function get({ country, actorCountry, key } = {}) {
  const dest = countryKey(country);
  const actor = countryKey(actorCountry || country);
  if (!vaults[dest]) return { ok: false, code: "UNKNOWN_COUNTRY" };
  if (actor !== dest) {
    const esat = require("../security/esatBey").inspect({
      type: "COUNTRY_CROSS_SHARE",
      details: { dest, actor, key },
      actor: "country_vault",
    });
    return { ok: false, code: "COUNTRY_ISOLATION", esat };
  }
  return { ok: true, item: vaults[dest].get(String(key)) || null };
}

function countries() {
  return AB27.slice();
}

module.exports = { put, get, resetVaults, countries };
