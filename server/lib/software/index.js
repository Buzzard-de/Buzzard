/**
 * Software completion facade — integrates existing engines. Not a second orchestrator.
 */

const { migrateSoftwareSchema } = require("./schema");
const { SOFTWARE_VERSION, CANONICAL_ENGINES } = require("./constants");
const canonical = require("./canonical");
const inventory = require("./inventory");
const pricing = require("./pricing");
const tracking = require("./tracking");
const marketplace = require("./marketplace");
const voice = require("./voice");
const customerAccess = require("./customerAccess");
const orders = require("./orders");
const { getSoftwareHealth } = require("./health");
const { searchCatalog, searchCanonicalCatalog } = require("./search");
const returns = require("./returns");
const reporting = require("./reporting");
const supplierFeeds = require("./supplierFeeds");
const communications = require("./communications");
const payments = require("./payments");
const carriers = require("./carriers");
const externalIntegrations = require("./externalIntegrations");
const workflow = require("./workflow");
const providerDiagnostics = require("./providerDiagnostics");

function initialize(db) {
  if (!db) throw new Error("database required");
  migrateSoftwareSchema(db);
  canonical.assertCanonicalOrchestrator();
  return { ok: true, version: SOFTWARE_VERSION };
}

function health(pusatHealth) {
  return getSoftwareHealth(pusatHealth);
}

module.exports = {
  SOFTWARE_VERSION,
  CANONICAL_ENGINES,
  initialize,
  health,
  canonical,
  inventory,
  pricing,
  tracking,
  marketplace,
  voice,
  customerAccess,
  orders,
  searchCatalog,
  searchCanonicalCatalog,
  returns,
  reporting,
  supplierFeeds,
  communications,
  payments,
  carriers,
  externalIntegrations,
  workflow,
  providerDiagnostics,
};
