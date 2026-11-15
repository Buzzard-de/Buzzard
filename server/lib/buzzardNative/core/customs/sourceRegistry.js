const crypto = require("crypto");

const SOURCES = Object.freeze([
  {
    id: "taric",
    name: "EU TARIC",
    officialUrl: "https://ec.europa.eu/taxation_customs/dds2/taric/taric_consultation.jsp",
    lastVerified: null,
    version: "schema-only",
    reliability: "UNKNOWN",
    fetchedLive: false,
  },
  {
    id: "eu_sanctions_map",
    name: "EU sanctions map",
    officialUrl: "https://www.sanctionsmap.eu",
    lastVerified: "2026-10-22",
    version: "url-reference-only",
    reliability: "UNVERIFIED",
    fetchedLive: false,
  },
  {
    id: "un_sanctions",
    name: "UN Security Council sanctions",
    officialUrl: "https://www.un.org/securitycouncil/sanctions/information",
    lastVerified: null,
    version: "schema-only",
    reliability: "UNKNOWN",
    fetchedLive: false,
  },
]);

function list() {
  return SOURCES.map((s) => ({
    ...s,
    sha256: crypto.createHash("sha256").update(JSON.stringify(s)).digest("hex"),
  }));
}

module.exports = { list, SOURCES };
