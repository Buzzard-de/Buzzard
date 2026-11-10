const constants = require("./constants");
const { createAgriculturalMachineryEngine } = require("./engine");
const { createTaxonomy, validateTaxonomy } = require("./taxonomy");
const { createMockConnector } = require("./catalog/mockConnector");
const isolation = require("../machineryDomainKit/isolation");

let singleton = null;

function getEngine() {
  if (!singleton) singleton = createAgriculturalMachineryEngine();
  return singleton;
}

function resetEngineForTests() {
  singleton = createAgriculturalMachineryEngine();
  return singleton;
}

module.exports = {
  ...constants,
  createAgriculturalMachineryEngine,
  createTaxonomy,
  validateTaxonomy,
  createMockConnector,
  isolation,
  getEngine,
  resetEngineForTests,
};
