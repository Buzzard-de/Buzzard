/**
 * Carrier master v11 (MC14). Wraps v10. Does not rewrite v1–v10 JSON.
 */
const { buildMasterV10, V9_BASELINE } = require("./eu27SeedV10");
const { germanyPilot, commercialPrep } = require("./v5/germanyPilot");
const { countryConfigs } = require("./v5/countryConfig");
const { dashboardSnapshot } = require("./v5/dashboardSnapshot");
const { councilStatus } = require("./v5/aiLogisticsCouncil");
const { metricsTemplate } = require("./v5/costEngine");
const { functionalityMatrix } = require("./v5/apiFunctionality");
const { documentationCatalog } = require("./v5/adapterFramework");
const { qualityMetrics } = require("./v5/evidenceTaxonomy");

const RETRIEVED = "2026-11-07";

const V10_BASELINE = Object.freeze({
  namedEntities: 1602,
  uniqueLegalKeys: 1465,
  registerLayerSum: 17453,
  activityVerified: 31,
  parcelServiceIndependentlyVerified: 0,
  postcodeCoverageVerifiedCountries: 0,
  apiDocumentationEntries: 16,
  sandboxTests: 0,
  liveUsable: 0,
});

function buildMasterV11() {
  const base = buildMasterV10();
  const catalog = documentationCatalog();
  const apiMatrix = functionalityMatrix(catalog);
  const sandbox = apiMatrix.map((r) => r.sandboxReadiness);
  const pilot = germanyPilot();

  const master = {
    ...base,
    schema: "buzzard.eu27-carrier-master.v11",
    previousSchema: base.schema,
    retrievedAt: RETRIEVED,
    v10Baseline: V10_BASELINE,
    v9Baseline: V9_BASELINE,
    documentationCatalog: catalog,
    apiFunctionality: apiMatrix,
    sandboxReadiness: sandbox,
    germanyPilot: pilot,
    commercialPrep: commercialPrep(),
    countryConfigs: countryConfigs(),
    aiCouncil: councilStatus(),
    financialMetrics: metricsTemplate(),
    newLegalEntitiesMc14: 0,
    newLocalRegionalVerifiedMc14: 0,
    postcodeCoverageVerifiedCountries: 0,
    sandboxVerifiedCarriers: 0,
    technicallyUsableLiveCarriers: 0,
    liveShipment: false,
    salesEnabled: false,
    notes: [
      ...(base.notes || []),
      "v11 (MC14): operational readiness on existing v5 engine. No second logistics stack.",
      "Hermes Germany HSI public docs added (maturity 1). Catalog 16→17. No sandbox credentials.",
      "No new legal names. newLegalEntitiesMc14=0. Postcode coverage still 0/27. Live=0.",
    ],
  };
  master.dashboard = dashboardSnapshot(master);
  master.qualityMetrics = {
    ...qualityMetrics(master),
    apiDocumentationCount: catalog.length,
    mockTestedAdapters: sandbox.filter((s) => s.MOCK_TESTED).length,
    sandboxReady: sandbox.filter((s) => s.SANDBOX_READY).length,
    sandboxVerified: sandbox.filter((s) => s.SANDBOX_VERIFIED).length,
    adapterDesignReady: sandbox.filter((s) => s.ADAPTER_DESIGN_READY).length,
    liveUsableCarrierCount: 0,
    newLegalEntitiesMc14: 0,
    hermesDocumented: catalog.some((c) => c.carrierId === "hermes-germany-hsi"),
  };
  return master;
}

module.exports = { buildMasterV11, V10_BASELINE };
