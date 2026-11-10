const constants = require("./constants");
const { createConstructionMachineryEngine } = require("./engine");
const { createTaxonomy, validateTaxonomy, loadTaxonomyDocument } = require("./taxonomy");
const { createMockConnector } = require("./catalog/mockConnector");
const { assertConnectorContract } = require("./catalog/contracts");

let singleton = null;

function getEngine() {
  if (!singleton) singleton = createConstructionMachineryEngine();
  return singleton;
}

function resetEngineForTests() {
  singleton = createConstructionMachineryEngine();
  return singleton;
}

module.exports = {
  ...constants,
  createConstructionMachineryEngine,
  createTaxonomy,
  validateTaxonomy,
  loadTaxonomyDocument,
  createMockConnector,
  assertConnectorContract,
  getEngine,
  resetEngineForTests,
};
