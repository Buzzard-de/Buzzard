/**
 * Carrier master v8 (MC12). Continues v7 evidence layer. Does not rewrite v1–v7 JSON.
 */
const { buildMasterV7 } = require("./eu27SeedV7");
const { serviceStatus, countStatuses } = require("./v5/serviceVerification");
const { countryCoverageMatrix, postcodeLicenseMatrix, carrierPostcodeCoverage, countryList } = require("./v5/coverageEngine");
const { documentationCatalog, priorityCatalog } = require("./v5/adapterFramework");
const { roleModel } = require("./v5/supplierCarrier");
const { qualityMetrics } = require("./v5/evidenceTaxonomy");

const RETRIEVED = "2026-11-06";

const MC11_BASELINE = Object.freeze({
  namedEntities: 1602,
  uniqueLegalKeys: 1465,
  registerLayerSum: 17453,
  activityVerified: 31,
  parcelServiceIndependentlyVerified: 0,
  postcodeCoverageVerifiedCountries: 0,
  apiDocumentationEntries: 7,
  sandboxTests: 0,
});

const ACCESS_PROBES = Object.freeze([
  {
    iso: "HU",
    url: "https://nmhh.hu/posta/nyilvantartas",
    http: 200,
    tls: "VERIFIED",
    sha256_16: "99d7bafe9497d404",
    result: "BLOCKED",
    note: "Rechecked 2026-11-06 12:00 Europe/Berlin. Excel mentioned; still no xlsx/csv href.",
  },
  {
    iso: "PT",
    url: "https://www.anacom.pt/render.jsp?categoryId=278775",
    http: 403,
    tls: "VERIFIED",
    result: "BLOCKED",
    note: "Alphabetical list still HTTP 403. Login not attempted.",
  },
  {
    iso: "LT",
    url: "https://rrt.lt/veiklos-sritys/pastas/pasto-paslauga/pasto-paslaugu-teikejai",
    http: 200,
    tls: "VERIFIED",
    result: "BLOCKED",
    note: "Power BI embed still present. Bulk export not performed.",
  },
  {
    iso: "RO",
    url: "https://www.ancom.ro/reglementare-ro/servicii-postale/furnizori-servicii-postale/furnizori-servicii-postale-autorizati/",
    http: null,
    tls: "CERTIFICATE_VERIFY_FAILED",
    result: "BLOCKED",
    note: "TLS verify still fails. Certificate checks not disabled.",
  },
  {
    iso: "AT",
    url: "https://data.rtr.at/pages/open-data/pt-agg",
    http: 200,
    tls: "VERIFIED",
    result: "BLOCKED",
    note: "§25 Anzeige/open-data frontend is a SPA shell; full operator table not bulk-extracted. PEV 16 names remain the sourced named set.",
  },
  {
    iso: "PL",
    url: "https://www.uke.gov.pl",
    result: "NOT_RE_PAGED",
    note: "UKE 234 B-numbers from prior ingest kept. Remaining pages not fetched this run. B-number ≠ parcel-service proof.",
  },
  {
    iso: "EL",
    result: "CLASSIFICATION_ONLY",
    note: "EETT POST_* rows remain REGISTER_ONLY / postal licence. Not last-mile verified.",
  },
  {
    iso: "NL",
    result: "CLASSIFICATION_ONLY",
    note: "ACM postvervoer vs pakketbezorgdienst split retained. Packet register class is not parcel-service verification.",
  },
]);

function countryCompletion(base) {
  const blocked = new Set(["HU", "PT", "LT", "RO"]);
  const partialNames = new Set(["AT", "HR", "NL", "PL", "EL"]);
  return countryList().map((iso) => {
    const st = base.researchStatus[iso] || {};
    let completion = "PARTIAL";
    if (blocked.has(iso)) completion = "BLOCKED";
    else if (partialNames.has(iso)) completion = "PARTIAL_NAMES_OR_REGISTER";
    return {
      iso,
      completion,
      completeVerified: false,
      researchStatus: st.status || "UNKNOWN",
      postcodeCoverage: "UNKNOWN",
      coverageGranularity: "UNKNOWN",
    };
  });
}

function buildMasterV8() {
  const base = buildMasterV7();
  const apiCatalog = documentationCatalog();
  const entities = base.entities.map((e) => ({
    ...e,
    serviceVerification: serviceStatus(e),
    coverageGranularity: "UNKNOWN",
  }));

  const master = {
    schema: "buzzard.eu27-carrier-master.v8",
    previousSchema: base.schema,
    retrievedAt: RETRIEVED,
    salesEnabled: false,
    liveShipment: false,
    completeVerifiedCountries: 0,
    technicallyUsableLiveCarriers: 0,
    sandboxVerifiedCarriers: 0,
    mc11Baseline: MC11_BASELINE,
    v6BaselineFrozen: base.v6BaselineFrozen,
    sources: base.sources,
    countries: base.countries,
    entities,
    counts: base.counts,
    lockers: base.lockers,
    pudo: base.pudo,
    internationalOperations: base.internationalOperations,
    apiDocs: base.apiDocs,
    apiCatalog: priorityCatalog(),
    documentationCatalog: apiCatalog,
    serviceStatusCounts: countStatuses(entities),
    naceStatistics: base.naceStatistics,
    coverage: countryCoverageMatrix(),
    postcodeLicenses: postcodeLicenseMatrix(),
    carrierCoverageTemplate: carrierPostcodeCoverage({}),
    countryCompletion: countryCompletion(base),
    researchStatus: base.researchStatus,
    derivedClassifications: base.derivedClassifications,
    identity: base.identity,
    networkRoles: base.networkRoles,
    registerLayerSum: base.registerLayerSum,
    supplierCarrier: roleModel(),
    accessProbes: ACCESS_PROBES,
    uniqueNamedLegalInDatabase: entities.length,
    uniqueLegalByCompanyKey: base.uniqueLegalByCompanyKey,
    activityVerifiedCount: base.activityVerifiedCount,
    ownFleetVerifiedCount: base.ownFleetVerifiedCount,
    notes: [
      "v1–v7 JSON preserved. v8 adds service-verification ladder, coverage granularity, extra API docs at maturity 1.",
      "MC11 baseline frozen: 1602 / 1465 / 17453 / activity 31 / parcel verified 0 / postcode 0/27 / API docs 7 / sandbox 0.",
      "New API doc entries are documentation only (InPost, Packeta, PostNord, Posti, CTT). Named legal census unchanged.",
      "COMPLETE_VERIFIED=0. Live=0. Sandbox=0. No invented legal names.",
    ],
  };
  master.qualityMetrics = {
    ...qualityMetrics(master),
    apiDocumentationCount: apiCatalog.length,
    mc11ApiDocumentationEntries: 7,
    apiDocumentationDelta: apiCatalog.length - 7,
    mockTestSuccessCount: "SEE_TEST_RESULTS",
    sandboxTestSuccessCount: 0,
    liveUsableCarrierCount: 0,
    coverageGranularityPostcodeCountries: 0,
    coverageGranularityCountryLevelCountries: 0,
    coverageGranularityUnknownCountries: 27,
  };
  return master;
}

module.exports = { buildMasterV8, MC11_BASELINE, ACCESS_PROBES };
