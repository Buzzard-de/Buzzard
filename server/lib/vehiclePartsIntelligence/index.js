const constants = require("./constants");
const { createVehiclePartsEngine } = require("./engine");
const { createTaxonomy, validateTaxonomy } = require("./taxonomy");
const { createMockConnector } = require("./catalog/mockConnector");
const { inspectVin } = require("./vin");
const isolation = require("../machineryDomainKit/isolation");

let singleton = null;

function getEngine() {
  const persist = require("../machineryDomainKit/persistence");
  if (!singleton) singleton = createVehiclePartsEngine({ persist: persist.shouldPersistSingleton() });
  return singleton;
}

function resetEngineForTests() {
  singleton = createVehiclePartsEngine();
  return singleton;
}

module.exports = {
  ...constants,
  createVehiclePartsEngine,
  createTaxonomy,
  validateTaxonomy,
  createMockConnector,
  inspectVin,
  isolation,
  getEngine,
  resetEngineForTests,
};
