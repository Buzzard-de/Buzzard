/**
 * Carrier master v9 (2026-11-07 continuation). Does not rewrite v1–v8 JSON.
 */
const { buildMasterV8 } = require("./eu27SeedV8");
const { documentationCatalog, priorityCatalog } = require("./v5/adapterFramework");
const { postcodePortalRegistry, countryCoverageMatrix, postcodeLicenseMatrix } = require("./v5/coverageEngine");
const { qualityMetrics } = require("./v5/evidenceTaxonomy");
const { countStatuses } = require("./v5/serviceVerification");

const RETRIEVED = "2026-11-07";

const MC12_BASELINE = Object.freeze({
  namedEntities: 1602,
  uniqueLegalKeys: 1465,
  registerLayerSum: 17453,
  activityVerified: 31,
  parcelServiceIndependentlyVerified: 0,
  postcodeCoverageVerifiedCountries: 0,
  apiDocumentationEntries: 12,
  sandboxTests: 0,
});

function namedFirmReview(entities) {
  const usp = entities.filter((e) => e.class === "NATIONAL_POST_USP");
  const privateParcel = entities.filter((e) => e.class === "PRIVATE_PARCEL" || e.class === "PRIVATE_EXPRESS");
  const lastMileClass = entities.filter((e) => e.class === "LAST_MILE" || e.class === "SAME_DAY");
  const active = entities.filter((e) => e.activityVerified);
  return {
    uspRows: usp.length,
    uspParcelIndependentlyVerified: 0,
    privateParcelOrExpressClassRows: privateParcel.length,
    lastMileOrSameDayClassRows: lastMileClass.length,
    activityVerifiedFlags: active.length,
    ownFleetVerified: 0,
    lastMileVerified: 0,
    parcelServiceVerified: 0,
    note: "Class labels and USP designation are not independent parcel/last-mile/own-fleet proof. No new legal names added.",
  };
}

function buildMasterV9() {
  const base = buildMasterV8();
  const apiCatalog = documentationCatalog();
  const entities = base.entities;
  const master = {
    schema: "buzzard.eu27-carrier-master.v9",
    previousSchema: base.schema,
    retrievedAt: RETRIEVED,
    salesEnabled: false,
    liveShipment: false,
    completeVerifiedCountries: 0,
    technicallyUsableLiveCarriers: 0,
    sandboxVerifiedCarriers: 0,
    mc12Baseline: MC12_BASELINE,
    mc11Baseline: base.mc11Baseline,
    v6BaselineFrozen: base.v6BaselineFrozen,
    sources: base.sources,
    countries: base.countries,
    entities,
    counts: base.counts,
    lockers: base.lockers,
    pudo: base.pudo,
    internationalOperations: base.internationalOperations,
    apiCatalog: priorityCatalog(),
    documentationCatalog: apiCatalog,
    serviceStatusCounts: countStatuses(entities),
    namedFirmReview: namedFirmReview(entities),
    naceStatistics: base.naceStatistics,
    coverage: countryCoverageMatrix(),
    postcodeLicenses: postcodeLicenseMatrix(),
    postcodePortals: postcodePortalRegistry(),
    countryCompletion: base.countryCompletion,
    researchStatus: base.researchStatus,
    derivedClassifications: base.derivedClassifications,
    identity: base.identity,
    networkRoles: base.networkRoles,
    registerLayerSum: base.registerLayerSum,
    supplierCarrier: base.supplierCarrier,
    accessProbes: [
      ...base.accessProbes,
      {
        iso: "HU",
        url: "https://nmhh.hu/posta/nyilvantartas",
        http: 200,
        tls: "VERIFIED",
        sha256_16: "99d7bafe9497d404",
        result: "BLOCKED",
        retrievedAt: RETRIEVED,
        note: "Rechecked 2026-11-07: Excel still advertised, no .xlsx href.",
      },
    ],
    uniqueNamedLegalInDatabase: entities.length,
    uniqueLegalByCompanyKey: base.uniqueLegalByCompanyKey,
    activityVerifiedCount: base.activityVerifiedCount,
    ownFleetVerifiedCount: base.ownFleetVerifiedCount,
    notes: [
      "v1–v8 JSON preserved. v9 adds postcode portal/licence notes and extra official API URLs (DPD, Austrian Post, FAN Courier).",
      "MC12 baseline frozen: 1602 / 1465 / 17453 / activity 31 / parcel 0 / postcode 0/27 / API docs 12 / sandbox 0.",
      "GISCO CC-BY-SA-4.0 and RTR PLZ portals documented, files not ingested, not treated as carrier coverage.",
      "DPD Baltic sandbox hostname documented; sandboxVerified remains false (no credentials, no e2e).",
      "COMPLETE_VERIFIED=0. Live=0. No invented legal names.",
    ],
  };
  master.qualityMetrics = {
    ...qualityMetrics(master),
    apiDocumentationCount: apiCatalog.length,
    mc12ApiDocumentationEntries: 12,
    apiDocumentationDeltaFromMc12: apiCatalog.length - 12,
    mockTestSuccessCount: "SEE_TEST_RESULTS",
    sandboxTestSuccessCount: 0,
    liveUsableCarrierCount: 0,
    coverageGranularityPostcodeCountries: 0,
    coverageGranularityCountryLevelCountries: 0,
    coverageGranularityUnknownCountries: 27,
    postcodePortalDocumented: master.postcodePortals.countries.filter((c) => c.portal && c.portal !== "UNKNOWN").length,
  };
  return master;
}

module.exports = { buildMasterV9, MC12_BASELINE };
