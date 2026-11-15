const { loadV11 } = require("../carrierMasterV11");
const { dashboardSnapshot } = require("./dashboardSnapshot");
const { germanyPilot } = require("./germanyPilot");
const { countryProfiles } = require("./countryProfiles");
const { engineStatus } = require("./integrationEngine");
const { isSalesEnabled } = require("../../salesMode");

function statusSnapshot() {
  const master = loadV11();
  return {
    schema: master.schema,
    salesEnabled: isSalesEnabled(),
    liveShipment: false,
    liveUsableCarriers: 0,
    sandboxVerified: 0,
    dashboard: dashboardSnapshot(master),
    germany: germanyPilot(),
    countries: countryProfiles(),
    engine: engineStatus(),
    quality: {
      named: master.uniqueNamedLegalInDatabase,
      uniqueLegal: master.uniqueLegalByCompanyKey,
      registerLayer: master.registerLayerSum,
      apiDocs: master.documentationCatalog.length,
      mockTested: master.qualityMetrics.mockTestedAdapters,
      parcelVerified: master.independentCounts.parcel_service_true,
      postcodeCountries: master.postcodeCoverageVerifiedCountries,
    },
  };
}

module.exports = { statusSnapshot };
