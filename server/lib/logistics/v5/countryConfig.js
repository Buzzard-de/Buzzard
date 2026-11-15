const { countryList } = require("./coverageEngine");

function countryConfigs() {
  return countryList().map((iso) => ({
    iso,
    enabled: iso === "DE",
    liveShipment: false,
    salesEnabled: false,
    pilot: iso === "DE",
    postcodeCoverage: "UNKNOWN",
    isolated: true,
  }));
}

function isCountryEnabled(iso) {
  const c = String(iso === "GR" ? "EL" : iso || "").toUpperCase();
  return c === "DE";
}

module.exports = { countryConfigs, isCountryEnabled };
