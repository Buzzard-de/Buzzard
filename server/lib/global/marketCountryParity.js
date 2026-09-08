/**
 * Server-side parity check: frontend market countries derive from 35-country global registry.
 */
const globalCountries = require("../../../data/global/global_countries_35.json");
const fs = require("fs");
const path = require("path");

function listGlobalCountryCodes() {
  return globalCountries.map((c) => c.countryCode);
}

function assertFrontendUsesGlobalRegistry() {
  const sourcePath = path.join(__dirname, "../../../lib/market/source.ts");
  const source = fs.readFileSync(sourcePath, "utf8");
  if (source.includes("buzzard_europe_countries.json")) {
    throw new Error("lib/market/source.ts must not import buzzard_europe_countries.json as active source");
  }
  if (!source.includes("marketCountryAdapter")) {
    throw new Error("lib/market/source.ts must use marketCountryAdapter from global registry");
  }
  return {
    count: globalCountries.length,
    codes: listGlobalCountryCodes(),
  };
}

module.exports = {
  listGlobalCountryCodes,
  assertFrontendUsesGlobalRegistry,
};
