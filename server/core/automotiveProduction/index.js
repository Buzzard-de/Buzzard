/**
 * Buzzard Automotive Production Integration Layer — unified facade.
 * Orchestrates existing Automotive Core Engine — does NOT duplicate engines.
 */
const automotiveCore = require("../automotiveCore");
const productionConfig = require("./productionConfig");
const productionSafety = require("./productionSafety");
const productionErrors = require("./productionErrors");
const integrationAudit = require("./integrationAudit");
const integrationRegistry = require("./integrationRegistry");
const supplierConnectorManager = require("./supplierConnectorManager");
const tecdocConnectorManager = require("./tecdocConnectorManager");
const productIngestionManager = require("./productIngestionManager");
const productNormalizationManager = require("./productNormalizationManager");
const productMatchingManager = require("./productMatchingManager");
const priceStockManager = require("./priceStockManager");
const orderIntegrationManager = require("./orderIntegrationManager");
const shippingIntegrationManager = require("./shippingIntegrationManager");
const trackingManager = require("./trackingManager");
const returnIntegrationManager = require("./returnIntegrationManager");
const syncScheduler = require("./syncScheduler");
const integrationHealth = require("./integrationHealth");
const integrationUtils = require("./integrationUtils");

function getProductionManifest() {
  return {
    ...integrationRegistry.getIntegrationManifest(),
    coreEngine: automotiveCore.getEngineManifest(),
    safety: productionSafety.assertProductionSafety(),
    modules: [
      "supplierConnectorManager", "tecdocConnectorManager", "productIngestionManager",
      "productNormalizationManager", "productMatchingManager", "priceStockManager",
      "orderIntegrationManager", "shippingIntegrationManager", "trackingManager",
      "returnIntegrationManager", "syncScheduler", "integrationHealth",
    ],
  };
}

module.exports = {
  ...automotiveCore,
  ...productionConfig,
  ...productionSafety,
  ...productionErrors,
  ...integrationAudit,
  ...integrationRegistry,
  ...supplierConnectorManager,
  ...tecdocConnectorManager,
  ...productIngestionManager,
  ...productNormalizationManager,
  ...productMatchingManager,
  ...priceStockManager,
  ...orderIntegrationManager,
  ...shippingIntegrationManager,
  ...trackingManager,
  ...returnIntegrationManager,
  ...syncScheduler,
  ...integrationHealth,
  ...integrationUtils,
  getProductionManifest,
};
