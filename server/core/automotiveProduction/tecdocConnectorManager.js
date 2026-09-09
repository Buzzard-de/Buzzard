/**
 * Automotive Production Integration — TecDoc connector manager (wraps automotive core).
 */
const automotiveCore = require("../automotiveCore");
const { canCallRealTecDoc } = require("./productionSafety");
const { PRODUCTION_CONFIG } = require("./productionConfig");
const { productionError } = require("./productionErrors");
const { checkRateLimit, isCircuitOpen, recordCircuitSuccess, recordCircuitFailure } = require("./integrationUtils");

const CIRCUIT_NAME = "tecdoc:main";

async function guardedTecDocCall(operation, fn) {
  if (isCircuitOpen(CIRCUIT_NAME)) {
    return productionError("CIRCUIT_OPEN", "TecDoc circuit breaker open", { stage: operation });
  }

  const rate = checkRateLimit("tecdoc", PRODUCTION_CONFIG.tecdocRateLimit());
  if (!rate.allowed) {
    return productionError("TECDOC_RATE_LIMIT", "TecDoc rate limit exceeded", {
      stage: operation,
      retryable: true,
    });
  }

  if (canCallRealTecDoc()) {
    return productionError("TECDOC_DISABLED", "Real TecDoc blocked — safety gate", { stage: operation });
  }

  try {
    const result = await fn();
    recordCircuitSuccess(CIRCUIT_NAME);
    return result;
  } catch (err) {
    recordCircuitFailure(CIRCUIT_NAME);
    return productionError("TECDOC_TIMEOUT", err.message, { stage: operation, retryable: true });
  }
}

function getTecDocAdapter() {
  return automotiveCore.createTecDocAdapter();
}

async function searchVehicle(query = {}) {
  return guardedTecDocCall("searchVehicle", async () => {
    const adapter = getTecDocAdapter();
    const result = await adapter.getVehicle(query);
    return { ok: true, mode: adapter.mode || "mock", ...result };
  });
}

async function getVehicle(idOrQuery) {
  return searchVehicle(typeof idOrQuery === "object" ? idOrQuery : { id: idOrQuery });
}

async function getMakes() {
  return guardedTecDocCall("getMakes", async () => {
    const adapter = getTecDocAdapter();
    const result = await adapter.getManufacturers?.() || adapter.getManufacturers?.();
    return { ok: true, mode: adapter.mode || "mock", manufacturers: result?.manufacturers || [] };
  });
}

async function getModels(make) {
  return guardedTecDocCall("getModels", async () => ({
    ok: true,
    mode: "mock",
    make,
    models: [],
    dryRun: true,
  }));
}

async function getGenerations(make, model) {
  return guardedTecDocCall("getGenerations", async () => ({
    ok: true,
    mode: "mock",
    make,
    model,
    generations: [],
  }));
}

async function getEngines(make, model, generation) {
  return guardedTecDocCall("getEngines", async () => ({
    ok: true,
    mode: "mock",
    make,
    model,
    generation,
    engines: [],
  }));
}

async function searchParts(query) {
  return guardedTecDocCall("searchParts", async () => {
    const adapter = getTecDocAdapter();
    const result = await adapter.searchParts(query);
    return { ok: true, mode: adapter.mode || "mock", ...result };
  });
}

async function getPart(partId) {
  return guardedTecDocCall("getPart", async () => {
    const adapter = getTecDocAdapter();
    const result = await adapter.getPart(partId);
    return { ok: true, mode: adapter.mode || "mock", ...result };
  });
}

async function getFitment(sku) {
  return guardedTecDocCall("getFitment", async () => {
    const adapter = getTecDocAdapter();
    const result = await adapter.getVehicleFitment(sku);
    return { ok: true, mode: adapter.mode || "mock", ...result };
  });
}

async function getOemReferences(partId) {
  return guardedTecDocCall("getOemReferences", async () => ({
    ok: true,
    mode: "mock",
    partId,
    references: [],
    autoEquivalent: false,
  }));
}

function getTecDocConnectorStatus() {
  const status = automotiveCore.getTecDocStatus();
  return {
    ...status,
    live: false,
    realCallsAllowed: canCallRealTecDoc(),
    circuit: isCircuitOpen(CIRCUIT_NAME) ? "OPEN" : "CLOSED",
  };
}

module.exports = {
  getTecDocAdapter,
  searchVehicle,
  getVehicle,
  getMakes,
  getModels,
  getGenerations,
  getEngines,
  searchParts,
  getPart,
  getFitment,
  getOemReferences,
  getTecDocConnectorStatus,
};
