/**
 * Carrier master v10 (MC13). Does not rewrite v1–v9 JSON.
 */
const { buildMasterV9 } = require("./eu27SeedV9");
const { independentEvidence, countIndependent } = require("./v5/independentEvidence");
const { functionalityMatrix } = require("./v5/apiFunctionality");
const { documentationCatalog, priorityCatalog } = require("./v5/adapterFramework");
const { roleModel } = require("./v5/supplierCarrier");
const { countryCoverageMatrix, postcodeLicenseMatrix, postcodePortalRegistry } = require("./v5/coverageEngine");
const { qualityMetrics } = require("./v5/evidenceTaxonomy");
const { countStatuses } = require("./v5/serviceVerification");

const RETRIEVED = "2026-11-07";

const V9_BASELINE = Object.freeze({
  namedEntities: 1602,
  uniqueLegalKeys: 1465,
  registerLayerSum: 17453,
  activityVerified: 31,
  parcelServiceIndependentlyVerified: 0,
  postcodeCoverageVerifiedCountries: 0,
  apiDocumentationEntries: 16,
  sandboxTests: 0,
});

const LOCAL_CLASSES = new Set([
  "LOCAL_COURIER",
  "REGIONAL_COURIER",
  "REGIONAL_SPECIALIST",
  "LAST_MILE",
  "SAME_DAY",
]);

function localRegionalIndex(entities) {
  return entities
    .filter((e) => LOCAL_CLASSES.has(e.class))
    .map((e) => ({
      id: e.id,
      country: e.hqCountry,
      legal_entity_name: e.legalName,
      trading_name: e.brand,
      class: e.class,
      company_registration_number: e.companyNumber || "UNKNOWN",
      website: e.website || "UNKNOWN",
      parcel_service: e.independentEvidence?.parcel_service || "UNKNOWN",
      last_mile: "UNKNOWN",
      own_fleet: "UNKNOWN",
      postcodes: "UNKNOWN",
      newInMc13: false,
      note: "Existing inventory class row. Class label is not PARCEL_SERVICE_VERIFIED.",
    }));
}

function buildMasterV10() {
  const base = buildMasterV9();
  const catalog = documentationCatalog();
  const entities = base.entities.map((e) => ({
    ...e,
    independentEvidence: independentEvidence(e),
  }));
  const localRegional = localRegionalIndex(entities);
  const apiMatrix = functionalityMatrix(catalog);
  const sandbox = apiMatrix.map((r) => r.sandboxReadiness);

  const master = {
    schema: "buzzard.eu27-carrier-master.v10",
    previousSchema: base.schema,
    retrievedAt: RETRIEVED,
    salesEnabled: false,
    liveShipment: false,
    completeVerifiedCountries: 0,
    technicallyUsableLiveCarriers: 0,
    sandboxVerifiedCarriers: 0,
    v9Baseline: V9_BASELINE,
    mc12Baseline: base.mc12Baseline,
    sources: base.sources,
    countries: base.countries,
    entities,
    counts: base.counts,
    lockers: base.lockers,
    pudo: base.pudo,
    internationalOperations: base.internationalOperations,
    apiCatalog: priorityCatalog(),
    documentationCatalog: catalog,
    apiFunctionality: apiMatrix,
    sandboxReadiness: sandbox,
    serviceStatusCounts: countStatuses(entities),
    independentCounts: countIndependent(entities),
    localRegionalClassRows: localRegional,
    newLegalEntitiesMc13: 0,
    newLocalRegionalVerifiedMc13: 0,
    namedFirmReview: base.namedFirmReview,
    coverage: countryCoverageMatrix(),
    postcodeLicenses: postcodeLicenseMatrix(),
    postcodePortals: postcodePortalRegistry(),
    countryCompletion: base.countryCompletion,
    researchStatus: base.researchStatus,
    derivedClassifications: base.derivedClassifications,
    identity: base.identity,
    networkRoles: base.networkRoles,
    registerLayerSum: base.registerLayerSum,
    supplierCarrier: {
      ...roleModel(),
      manyToManySupported: true,
    },
    accessProbes: base.accessProbes,
    uniqueNamedLegalInDatabase: entities.length,
    uniqueLegalByCompanyKey: base.uniqueLegalByCompanyKey,
    activityVerifiedCount: base.activityVerifiedCount,
    ownFleetVerifiedCount: base.ownFleetVerifiedCount,
    notes: [
      "v1–v9 JSON preserved. v10 adds independent evidence flags, API functionality matrix, sandbox readiness, many-to-many supplier-carrier.",
      "No new legal names invented. newLegalEntitiesMc13=0. Existing LOCAL/REGIONAL class rows listed, not parcel-verified.",
      "API catalog still documentation; MOCK_TESTED=3 (DHL/GLS/UPS shared adapter). SANDBOX_VERIFIED=0.",
      "Postcode coverage 0/27. COMPLETE_VERIFIED=0. Live=0.",
    ],
  };
  master.qualityMetrics = {
    ...qualityMetrics(master),
    apiDocumentationCount: catalog.length,
    mockTestedAdapters: sandbox.filter((s) => s.MOCK_TESTED).length,
    sandboxReady: sandbox.filter((s) => s.SANDBOX_READY).length,
    sandboxVerified: sandbox.filter((s) => s.SANDBOX_VERIFIED).length,
    adapterDesignReady: sandbox.filter((s) => s.ADAPTER_DESIGN_READY).length,
    liveUsableCarrierCount: 0,
    newLegalEntitiesMc13: 0,
    newLocalRegionalVerifiedMc13: 0,
    localRegionalClassRows: localRegional.length,
  };
  return master;
}

module.exports = { buildMasterV10, V9_BASELINE, LOCAL_CLASSES };
