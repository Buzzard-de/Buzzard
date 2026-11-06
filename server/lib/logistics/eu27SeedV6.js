/**
 * Carrier master v6. Extends v5 engines in place. No parallel logistics stack.
 */
const v5mod = require("./eu27SeedV5");
const { networkRole, dedupe } = require("./v5/identityResolver");
const { priorityCatalog } = require("./v5/adapterFramework");
const { engineStatus, costModel, performanceModel } = require("./v5/integrationEngine");
const { policy, credentialRegistry } = require("./v5/securityPolicy");
const { countryCoverageMatrix } = require("./v5/coverageEngine");

const RETRIEVED = "2026-11-06";

function overlayRegister(c, patch) {
  return { ...c, register: { ...c.register, ...patch }, verification: patch.status || c.verification };
}

function buildMasterV6() {
  const base = v5mod.buildMasterV5();
  const entities = base.entities.map((e) => ({
    ...e,
    networkRole: networkRole(e),
    own_fleet_status: e.own_fleet_status || "UNKNOWN",
    parcel_service_verified: e.parcel_service_verified || "UNKNOWN",
  }));

  const counts = base.counts.map((c) => {
    if (c.iso === "HU") {
      return overlayRegister(c, {
        status: "DATA_INCOMPLETE",
        method: "nmhh_excel_href_absent_rechecked_2026_11_06",
        note: "Rechecked NMHH HTML: Excel advertised, no xlsx href. Locker/PUDO stay separate.",
      });
    }
    if (c.iso === "PT") {
      return overlayRegister(c, {
        status: "DATA_INCOMPLETE",
        method: "anacom_digital_login_required",
        note: "Alphabetical list HTTP 403. digital.anacom.pt postal services require ANACOM B2C login. Unique postal-only count UNKNOWN. 15 named titles preserved.",
      });
    }
    if (c.iso === "LT") {
      return overlayRegister(c, {
        status: "DATA_INCOMPLETE",
        method: "rrt_powerbi_no_export_rechecked",
        note: "Power BI embed reconfirmed. Bulk export not performed. Named: AB Lietuvos paštas, UAB Omniva LT.",
      });
    }
    if (c.iso === "RO") {
      return overlayRegister(c, {
        status: "DATA_INCOMPLETE",
        method: "ancom_tls_verify_failed_no_insecure_bypass",
        note: "TLS verify failed. Did not disable certificate checks. Full authorised list not extracted.",
      });
    }
    return c;
  });

  const sourceVerified = entities.filter(
    (e) => String(e.reliability).startsWith("VERIFIED") || e.reliability === "SOURCE_VERIFIED"
  );
  const keys = dedupe(sourceVerified);
  const layerSum = counts.reduce((a, c) => a + (c.register.records != null ? c.register.records : 0), 0);
  const roleCounts = {};
  for (const e of entities) {
    roleCounts[e.networkRole] = (roleCounts[e.networkRole] || 0) + 1;
  }

  const catalog = priorityCatalog().map((c) => ({
    ...c,
    apiLevel: 2,
    sandboxVerified: false,
    liveVerified: false,
    revalidatedAt: RETRIEVED,
  }));

  return {
    schema: "buzzard.eu27-carrier-master.v6",
    previousSchema: base.schema,
    retrievedAt: RETRIEVED,
    salesEnabled: false,
    liveShipment: false,
    completeVerifiedCountries: 0,
    technicallyUsableLiveCarriers: 0,
    sandboxVerifiedCarriers: 0,
    sources: base.sources,
    countries: base.countries,
    entities,
    counts,
    lockers: base.lockers,
    pudo: base.pudo,
    internationalOperations: base.internationalOperations,
    internationalBrandCountryMatrix: base.internationalBrandCountryMatrix,
    apiDocs: base.apiDocs,
    apiCatalog: catalog,
    naceStatistics: {
      ...base.naceStatistics,
      revalidatedAt: RETRIEVED,
      eurostatUpdatedUnchanged: "2026-09-30T11:00:00+0200",
      doNotUseAsActiveParcelCarriers: true,
    },
    coverage: countryCoverageMatrix(),
    researchStatus: base.researchStatus,
    derivedClassifications: base.derivedClassifications,
    identity: { uniqueLegalKeys: keys.unique, collisions: keys.collisions.length },
    networkRoles: roleCounts,
    registerLayerSum: layerSum,
    v5Recount: {
      entities: 1602,
      uniqueLegalKeys: 1465,
      activityVerified: 31,
      usp: 27,
      lockers: 14,
      pudo: 6,
      internationalOps: 64,
      registerLayerSumNow: layerSum,
      registerLayerSumPreviouslyReported: 17452,
      layerSumDeltaNote: "v5 live recount of register.records sum is 17453 after HR overlay 24 vs earlier 23.",
    },
    integrationEngine: engineStatus(),
    securityPolicy: policy(),
    credentials: credentialRegistry(),
    costModel: costModel(),
    performanceModel: performanceModel(),
    uniqueSourceVerified: sourceVerified.length,
    uniqueV1VerifiedPreserved: base.uniqueV1VerifiedPreserved,
    uniqueNamedLegalInDatabase: entities.length,
    uniqueLegalByCompanyKey: keys.unique,
    activityVerifiedCount: entities.filter((e) => e.activityVerified).length,
    ownFleetVerifiedCount: entities.filter((e) => e.own_fleet_status === "OWN_FLEET_VERIFIED").length,
    candidates: entities.filter((e) => e.reliability === "RESEARCH_CANDIDATE").length,
    austria138: base.austria138,
    notes: [
      "v1–v5 preserved. v6 extends v5 engines; no second stack.",
      "Eurostat H53 re-pulled 2026-11-06: same 186813/200000/206964/224523. 197424 still not reproduced.",
      "ELA ~60000 remains separate.",
      "HU Excel, PT login wall, LT Power BI, RO TLS remain BLOCKED without bypass.",
      "networkRole REGISTERED is not PARCEL_SERVICE_VERIFIED or OWN_FLEET_VERIFIED.",
      "COMPLETE_VERIFIED=0. Live carriers=0. Sandbox verified=0.",
    ],
  };
}

module.exports = { buildMasterV6 };
