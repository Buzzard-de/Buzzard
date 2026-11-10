const { ENGINE_ID, SHOP_L1_ID, DOMAIN } = require("./constants");
const { createTaxonomy } = require("./taxonomy");
const kit = require("../machineryDomainKit");
const { upsertMachine, getMachine, listMachines, validateMachineInput } = require("./machines");
const { upsertPart, getPart, listParts, findPartsByNumber, addPartRelation } = require("./parts");
const { addEvidence, correctEvidence, evaluateCompatibility } = require("./compatibility");
const { createRegistry } = require("./catalog/registry");
const { createImportJobs } = require("./catalog/importJobs");
const { search } = require("./search");
const { rankOffers, inventoryStatus } = require("./sourcing");

function createAgriculturalMachineryEngine(options = {}) {
  const taxonomy = options.taxonomy || createTaxonomy();
  const store = options.store || kit.createStore();
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
      machines: store.machines.size,
      parts: store.parts.size,
      evidence: store.evidence.size,
      offers: store.offers.size,
      connectors: registry.list(),
      implementation: "CODE_READY",
      providerConfigured: false,
      sandboxVerified: Boolean(options.sandboxVerified),
      liveVerified: false,
      liveCalls: false,
      salesFlagsUntouched: true,
      isolation: {
        constructionEngineUsed: false,
        automotiveEngineUsed: false,
      },
      mockSeeded: store.parts.size > 0,
      catalogSource: "mock-fixture",
      metrics: observability.snapshot(),
    };
  }

  async function importFrom(connectorId, payload) {
    const connector = registry.get(connectorId);
    if (!connector) return { ok: false, error: "unknown_connector" };
    const job = await imports.runImport({ connector, payload });
    return { ok: job.status !== "FAILED", job };
  }

  function searchParts(query) {
    const scope = kit.isolation.assertAgriculturalScope({ ...query, domain: query.domain || DOMAIN, categoryId: query.categoryId || SHOP_L1_ID });
    if (!scope.ok && query.requireScope) return { items: [], total: 0, isolation: scope };
    observability.record("search.request", { domain: DOMAIN });
    return search(store, query, taxonomy);
  }

  function evaluate(query) {
    const scope = kit.isolation.assertAgriculturalScope({ ...query, domain: query.domain || DOMAIN, categoryId: query.categoryId || query.shopCategoryId });
    if (query.forceForeignDomain || (query.categoryId && !scope.ok)) {
      observability.record("compatibility.rejected_domain", { domain: scope.domain });
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

  return {
    domain: DOMAIN,
    health,
    taxonomy,
    store,
    registry,
    upsertMachine: (input) => upsertMachine(store, input, taxonomy),
    getMachine: (id) => getMachine(store, id),
    listMachines: () => listMachines(store),
    validateMachineInput: (input) => validateMachineInput(input, taxonomy),
    upsertPart: (input) => upsertPart(store, input),
    getPart: (id) => getPart(store, id),
    listParts: () => listParts(store),
    findPartsByNumber: (value, manufacturer) => findPartsByNumber(store, value, manufacturer),
    addPartRelation: (input) => addPartRelation(store, input),
    addEvidence: (input) => addEvidence(store, input),
    correctEvidence: (input) => correctEvidence(store, input),
    evaluate,
    search: searchParts,
    importFrom,
    listJobs: () => imports.listJobs(),
    getJob: (id) => imports.getJob(id),
    rankOffers: (query) => rankOffers(store, query),
    inventoryStatus,
    observability,
  };
}

module.exports = { createAgriculturalMachineryEngine };
