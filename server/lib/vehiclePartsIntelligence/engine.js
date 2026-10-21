const { ENGINE_ID, SHOP_L1_ID, DOMAIN } = require("./constants");
const { createTaxonomy } = require("./taxonomy");
const kit = require("../machineryDomainKit");
const { upsertVehicle, getVehicle, listVehicles, validateVehicleInput } = require("./vehicles");
const { upsertPart, getPart, listParts, findPartsByNumber, addPartRelation } = require("./parts");
const { addEvidence, correctEvidence, evaluateCompatibility } = require("./compatibility");
const { classifyCrossReference } = require("./crossReference");
const { createRegistry } = require("./catalog/registry");
const { createImportJobs } = require("./catalog/importJobs");
const { search } = require("./search");
const { rankOffers } = require("./sourcing");
const { inspectVin } = require("./vin");

function createVehiclePartsEngine(options = {}) {
  const taxonomy = options.taxonomy || createTaxonomy();
  const bound = kit.persistence.preparePersistentStore(DOMAIN, options);
  const store = bound.store;
  const observability = options.observability || kit.createObservability();
  const registry = options.registry || createRegistry();
  const imports = createImportJobs(store, { taxonomy, observability });

  function health() {
    return {
      engine: ENGINE_ID,
      domain: DOMAIN,
      shopCategoryId: SHOP_L1_ID,
      taxonomyValid: taxonomy.validation.ok,
      taxonomyCount: taxonomy.validation.count,
      vehicles: store.machines.size,
      parts: store.parts.size,
      evidence: store.evidence.size,
      connectors: registry.list(),
      implementation: "CODE_READY",
      tecdoc: { liveCalls: false, status: process.env.TECDOC_API_KEY ? "CONFIGURED_MOCK" : "NOT_CONFIGURED" },
      providerConfigured: false,
      liveVerified: false,
      salesFlagsUntouched: true,
      isolation: { agriculturalEngineUsed: false, constructionEngineUsed: false },
      mockSeeded: store.parts.size > 0,
      catalogSource: "mock-fixture",
      metrics: observability.snapshot(),
    };
  }

  function evaluate(query = {}) {
    const scope = kit.isolation.assertAutomotiveScope({
      ...query,
      domain: query.domain || DOMAIN,
      categoryId: query.categoryId || query.shopCategoryId || SHOP_L1_ID,
    });
    if (query.categoryId && !scope.ok) {
      return {
        state: "INSUFFICIENT_DATA",
        rejectedDomain: scope.domain,
        explanation: scope.message,
        rulesApplied: ["domain_isolation"],
        missingInformation: ["wrong_domain"],
        aiSoleAuthority: false,
      };
    }
    observability.record("compatibility.evaluate", { domain: DOMAIN });
    return evaluateCompatibility(store, query);
  }

  function searchParts(query = {}) {
    const scope = kit.isolation.assertAutomotiveScope({
      ...query,
      domain: query.domain || DOMAIN,
      categoryId: query.categoryId || query.shopCategoryId || SHOP_L1_ID,
    });
    if (query.categoryId && !scope.ok) {
      return { items: [], total: 0, rejectedDomain: scope.domain, isolation: scope };
    }
    observability.record("search.request", { domain: DOMAIN });
    return search(store, query, taxonomy);
  }

  return {
    domain: DOMAIN,
    health,
    taxonomy,
    store,
    registry,
    upsertVehicle: (input) => upsertVehicle(store, input),
    getVehicle: (id) => getVehicle(store, id),
    listVehicles: () => listVehicles(store),
    validateVehicleInput,
    inspectVin,
    upsertPart: (input) => upsertPart(store, input),
    getPart: (id) => getPart(store, id),
    listParts: () => listParts(store),
    findPartsByNumber: (value, manufacturer) => findPartsByNumber(store, value, manufacturer),
    addPartRelation: (input) => addPartRelation(store, input),
    addEvidence: (input) => addEvidence(store, input),
    correctEvidence: (input) => correctEvidence(store, input),
    classifyCrossReference: (query) => classifyCrossReference(store, query),
    evaluate,
    search: searchParts,
    importFrom: async (connectorId, payload) => {
      const connector = registry.get(connectorId);
      if (!connector) return { ok: false, error: "unknown_connector" };
      const job = await imports.runImport({ connector, payload });
      return { ok: job.status !== "FAILED", job };
    },
    listJobs: () => imports.listJobs(),
    getJob: (id) => imports.getJob(id),
    rankOffers: (query) => rankOffers(store, query),
    observability,
    persistence: bound.persist ? { enabled: true, domain: DOMAIN } : { enabled: false },
  };
}

module.exports = { createVehiclePartsEngine };
