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
const { searchCatalog, searchCanonicalCatalog, getLocalSearchIndexStatus } = require("./search");
const returns = require("./returns");
const reporting = require("./reporting");
const supplierFeeds = require("./supplierFeeds");
const communications = require("./communications");
const payments = require("./payments");
const carriers = require("./carriers");
const externalIntegrations = require("./externalIntegrations");
const workflow = require("./workflow");
const providerDiagnostics = require("./providerDiagnostics");
const lifecycle = require("./lifecycle");
const operationsPack = require("./operationsPack");
const restoreGuard = require("./restoreGuard");
const connectorInventory = require("./connectorInventory");
const secureCommerce = require("./secureCommerce");
const officialPaymentIngress = require("./officialPaymentIngress");
const supplierSelection = require("./supplierSelection");
const supplierCredit = require("./supplierCredit");
const partialFulfillment = require("./partialFulfillment");
const competitorPrices = require("./competitorPrices");
const bankAdapters = require("./bankAdapters");
const carrierWebhooks = require("./carrierWebhooks");
const secretVault = require("./secretVault");
const monitoringReady = require("./monitoringReady");
const reportingModels = require("./reportingModels");
const localeCoverage = require("./localeCoverage");
const orderInventoryBridge = require("./orderInventoryBridge");
const orderIdentity = require("./orderIdentity");
const qrLoyalty = require("./qrLoyalty");

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
  getLocalSearchIndexStatus,
  returns,
  reporting,
  supplierFeeds,
  communications,
  payments,
  carriers,
  externalIntegrations,
  workflow,
  providerDiagnostics,
  lifecycle,
  operationsPack,
  restoreGuard,
  connectorInventory,
  secureCommerce,
  officialPaymentIngress,
  supplierSelection,
  supplierCredit,
  partialFulfillment,
  competitorPrices,
  bankAdapters,
  carrierWebhooks,
  secretVault,
  monitoringReady,
  reportingModels,
  localeCoverage,
  orderInventoryBridge,
  orderIdentity,
  qrLoyalty,
};
