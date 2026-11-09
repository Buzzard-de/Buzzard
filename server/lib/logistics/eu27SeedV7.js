/**
 * Carrier master v7. Continues v6 in the same engine folder. Does not rewrite v1–v6 files.
 */
const { buildMasterV6 } = require("./eu27SeedV6");
const { evidenceProfile, qualityMetrics } = require("./v5/evidenceTaxonomy");
const { roleModel } = require("./v5/supplierCarrier");
const { countryCoverageMatrix, postcodeLicenseMatrix } = require("./v5/coverageEngine");
const { priorityCatalog, documentationCatalog, MC11_MATURITY } = require("./v5/adapterFramework");
const { engineStatus } = require("./v5/integrationEngine");

const RETRIEVED = "2026-11-06";

const ACCESS_PROBES = Object.freeze([
  {
    iso: "HU",
    url: "https://nmhh.hu/posta/nyilvantartas",
    http: 200,
    tls: "VERIFIED",
    sha256_16: "38da171dc616d1ac",
    result: "BLOCKED",
    note: "Page advertises Excel; no xlsx/csv href in fetched HTML. Locker/PUDO stay off the carrier count.",
  },
  {
    iso: "PT",
    url: "https://www.anacom.pt/render.jsp?categoryId=278775",
    http: 403,
    tls: "VERIFIED",
    result: "BLOCKED",
    note: "Alphabetical list HTTP 403. Login not attempted. 15 named titles from v4/v6 preserved.",
  },
  {
    iso: "PT",
    url: "https://www.anacom.pt/render.jsp?categoryId=1738",
    http: null,
    tls: "TIMEOUT_OR_UNREACHABLE",
    result: "BLOCKED",
    note: "Prestadores registados timed out. Search snippets are not a complete census and were not ingested as new entities.",
  },
  {
    iso: "LT",
    url: "https://rrt.lt/veiklos-sritys/pastas/pasto-paslauga/pasto-paslaugu-teikejai",
    http: 200,
    tls: "VERIFIED",
    result: "BLOCKED",
    note: "Public page still embeds Power BI. Bulk export not performed. data.gov.lt dataset 2727 returned HTTP 500.",
  },
  {
    iso: "RO",
    url: "https://www.ancom.ro/reglementare-ro/servicii-postale/furnizori-servicii-postale/furnizori-servicii-postale-autorizati/",
    http: null,
    tls: "CERTIFICATE_VERIFY_FAILED",
    result: "BLOCKED",
    note: "Did not disable TLS. First-page names from prior research kept. Not a full register.",
  },
  {
    iso: "HR",
    url: "https://www.hakom.hr/hr/davatelji-usluga/288",
    http: 200,
    tls: "VERIFIED",
    sha256_16: "1bc62a6b4a07d12c",
    result: "CONFIRMED_UNCHANGED",
    note: "Page still states 24 providers (1 UU+ZPU+OPU, 3 ZPU, 2 ZPU+OPU, 18 OPU). Unique legal names remain 22. Not all parcel last-mile.",
  },
  {
    iso: "AT",
    url: "https://www.rtr.at/TKP/was_wir_tun/post/betreiberservice/liste_der_pev-betreiber.de.html",
    http: 200,
    tls: "VERIFIED",
    result: "CONFIRMED_UNCHANGED",
    note: "PEV list Stand 16. Februar 2026 still 16 names. Not the full §25 Anzeige list. 138 unused.",
  },
]);

function buildMasterV7() {
  const base = buildMasterV6();
  const entities = base.entities.map((e) => ({
    ...e,
    evidence: evidenceProfile(e),
  }));

  const catalog = documentationCatalog().map((c) => ({
    ...c,
    mc11Maturity: c.mc11Maturity,
    liveVerified: false,
    sandboxVerified: false,
    revalidatedAt: RETRIEVED,
  }));

  const master = {
    schema: "buzzard.eu27-carrier-master.v7",
    previousSchema: base.schema,
    retrievedAt: RETRIEVED,
    salesEnabled: false,
    liveShipment: false,
    completeVerifiedCountries: 0,
    technicallyUsableLiveCarriers: 0,
    sandboxVerifiedCarriers: 0,
    v6BaselineFrozen: {
      namedEntities: 1602,
      uniqueLegalKeys: 1465,
      registerLayerSum: 17453,
      activityVerified: 31,
      usp: 27,
      lockers: 14,
      pudo: 6,
      internationalOps: 64,
      note: "Unchanged: no new named legal rows were ingested in MC11.",
    },
    sources: base.sources,
    countries: base.countries,
    entities,
    counts: base.counts,
    lockers: base.lockers,
    pudo: base.pudo,
    internationalOperations: base.internationalOperations,
    internationalBrandCountryMatrix: base.internationalBrandCountryMatrix,
    apiDocs: base.apiDocs,
    apiCatalog: priorityCatalog(),
    documentationCatalog: catalog,
    mc11MaturityScale: MC11_MATURITY,
    naceStatistics: base.naceStatistics,
    coverage: countryCoverageMatrix(),
    postcodeLicenses: postcodeLicenseMatrix(),
    researchStatus: base.researchStatus,
    derivedClassifications: base.derivedClassifications,
    identity: base.identity,
    networkRoles: base.networkRoles,
    registerLayerSum: base.registerLayerSum,
    supplierCarrier: roleModel(),
    accessProbes: ACCESS_PROBES,
    integrationEngine: engineStatus(),
    securityPolicy: base.securityPolicy,
    credentials: base.credentials,
    costModel: base.costModel,
    performanceModel: base.performanceModel,
    uniqueSourceVerified: base.uniqueSourceVerified,
    uniqueV1VerifiedPreserved: base.uniqueV1VerifiedPreserved,
    uniqueNamedLegalInDatabase: entities.length,
    uniqueLegalByCompanyKey: base.uniqueLegalByCompanyKey,
    activityVerifiedCount: base.activityVerifiedCount,
    ownFleetVerifiedCount: base.ownFleetVerifiedCount,
    candidates: base.candidates,
    austria138: base.austria138,
    notes: [
      "v1–v6 JSON files preserved. v7 adds evidence profiles, supplier/carrier split, coverage licenses, MC11 API maturity.",
      "Named entity count and unique legal keys unchanged from v6 (1602 / 1465).",
      "HU Excel href still absent. PT 403. LT Power BI. RO TLS verify failed without bypass.",
      "HAKOM 24 / unique 22 confirmed. RTR PEV 16 confirmed at new URL.",
      "COMPLETE_VERIFIED=0. Live carriers=0. Sandbox verified=0.",
    ],
  };
  master.qualityMetrics = qualityMetrics(master);
  return master;
}

module.exports = { buildMasterV7, ACCESS_PROBES };
