const { loadV11 } = require("../carrierMasterV11");
const { countryConfigs } = require("./countryConfig");
const { documentationCatalog } = require("./adapterFramework");

function countryProfiles() {
  const master = loadV11();
  const configs = countryConfigs();
  const docs = documentationCatalog();
  return configs.map((cfg) => {
    const entities = master.entities.filter((e) => e.hqCountry === cfg.iso);
    const usp = entities.find((e) => e.class === "NATIONAL_POST_USP");
    return {
      iso: cfg.iso,
      enabled: cfg.enabled,
      liveShipment: false,
      salesEnabled: false,
      namedEntities: entities.length,
      nationalPost: usp
        ? { id: usp.id, legalName: usp.legalName, brand: usp.brand, parcel_service: usp.independentEvidence?.parcel_service }
        : "UNKNOWN",
      apiDocs: docs.filter((d) => d.country === cfg.iso).map((d) => d.carrierId),
      postcodeCoverage: "UNKNOWN",
      completion: (master.countryCompletion.find((c) => c.iso === cfg.iso) || {}).completion || "PARTIAL",
    };
  });
}

module.exports = { countryProfiles };
