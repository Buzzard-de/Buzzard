const { CONNECTOR_STATUS, ENGINE_ID, SHOP_L1_ID } = require("./constants");
const { createTaxonomy } = require("./taxonomy");
const { createStore } = require("./store");
const { upsertMachine, getMachine, listMachines, validateMachineInput } = require("./machines");
const { upsertPart, getPart, listParts, findPartsByNumber, addPartRelation } = require("./parts");
const { addEvidence, evaluateCompatibility } = require("./compatibility");
const { createRegistry } = require("./catalog/registry");
const { createImportJobs } = require("./catalog/importJobs");
const { search } = require("./search");
const { rankOffers, inventoryStatus } = require("./sourcing");
const { listDocuments, attachDocument, suggestVisualCandidates } = require("./documents");
const { createObservability } = require("./observability");
const { convertUnit } = require("./units");
const { normalizePartNumber } = require("./identifiers");
const isolation = require("../machineryDomainKit/isolation");

function createConstructionMachineryEngine(options = {}) {
  const taxonomy = options.taxonomy || createTaxonomy();
  const store = options.store || createStore();
  const observability = options.observability || createObservability();
  const registry = options.registry || createRegistry();
  const imports = createImportJobs(store, { taxonomy, observability });

  function health() {
    const connectors = registry.list();
    const mock = connectors.find((row) => row.id === "mock-local");
    return {
      engine: ENGINE_ID,
      shopCategoryId: SHOP_L1_ID,
      taxonomyValid: taxonomy.validation.ok,
      taxonomyCount: taxonomy.validation.count,
      machines: store.machines.size,
      parts: store.parts.size,
      evidence: store.evidence.size,
      offers: store.offers.size,
      connectors,
      implementation: "CODE_READY",
      localTests: "see server/__tests__/constructionMachinery.test.mjs",
      providerConfigured: false,
      sandboxVerified: Boolean(options.sandboxVerified),
      liveVerified: false,
      liveCalls: false,
      salesFlagsUntouched: true,
      mockConnector: mock || null,
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
    if (query.categoryId) {
      const scope = isolation.assertConstructionScope({ categoryId: query.categoryId, domain: query.domain });
      if (!scope.ok) {
        return { items: [], total: 0, rejectedDomain: scope.domain, isolation: scope };
      }
    }
    observability.record("search.request");
    const result = search(store, query, taxonomy);
    observability.record(result.items.length ? "search.hits" : "search.zero");
    return result;
  }

  function evaluate(query) {
    if (query.categoryId) {
      const scope = isolation.assertConstructionScope({ categoryId: query.categoryId, domain: query.domain });
      if (!scope.ok) {
        return {
          state: "INSUFFICIENT_DATA",
          rejectedDomain: scope.domain,
          explanation: scope.message,
          rulesApplied: ["domain_isolation"],
          missingInformation: ["wrong_domain"],
          aiSoleAuthority: false,
        };
      }
    }
    observability.record("compatibility.evaluate");
    const decision = evaluateCompatibility(store, query);
    if (decision.state === "INSUFFICIENT_DATA") observability.record("compatibility.insufficient");
    return decision;
  }

  return {
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
    evaluate,
    search: searchParts,
    importFrom,
    listJobs: () => imports.listJobs(),
    getJob: (id) => imports.getJob(id),
    rankOffers: (query) => rankOffers(store, query),
    inventoryStatus,
    listDocuments: (filters) => listDocuments(store, filters),
    attachDocument: (input) => attachDocument(store, input),
    suggestVisualCandidates,
    convertUnit,
    normalizePartNumber,
    observability,
  };
}

module.exports = { createConstructionMachineryEngine };
