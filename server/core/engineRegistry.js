/**
 * Buzzard ONE CORE — engine registry (PRIMARY / LEGACY / DEPRECATED).
 * Single authoritative source for which engine implementation is canonical.
 */
const path = require("path");

const ENGINES = Object.freeze({
  product: {
    primary: "server/lib/pim/productCore.js",
    legacy: [
      "server/lib/pimCatalog.js",
      "server/lib/productCatalogPim.js",
      "server/lib/productStore.js",
      "server/lib/p1CatalogPlatform.js",
    ],
    automotive: "server/core/automotiveCore/productEngine.js",
  },
  search: {
    primary: "server/lib/global/searchIntelligence.js",
    legacy: [
      "server/lib/pim/productSearch.js",
      "server/lib/advancedSearch.js",
    ],
    bridge: "server/core/automotiveCore/searchBridge.js",
    facade: "server/lib/commerce/productSearchAbstraction.js",
  },
  supplier: {
    primary: "server/lib/supplier/supplierImportPipeline.js",
    legacy: ["server/lib/supplierHub.js", "server/lib/supplierIntegrationHub.js"],
    automotive: "server/core/automotiveCore/supplierEngine.js",
    production: "server/core/automotiveProduction/supplierConnectorManager.js",
  },
  order: {
    primary: "server/lib/commerce/orderService.js",
    legacy: ["server/lib/orderManagement.js", "server/lib/orderManagementV32.js", "server/lib/dbOrders.js"],
    automotive: "server/core/automotiveCore/orderEngine.js",
    production: "server/core/automotiveProduction/orderIntegrationManager.js",
  },
  category: {
    primary: "server/lib/pim/categoryEngine.js",
    resolver: "server/lib/pim/categoryResolver.js",
    legacy: ["server/lib/embeddedSmartMenu48.js", "server/lib/taxonomyUnification.js"],
    automotive: "server/core/automotiveCore/categoryEngine.js",
  },
  fitment: {
    primary: "server/core/automotiveCore/fitmentEngine.js",
    pim: "server/lib/pim/fitmentSchema.js",
  },
  price: {
    primary: "server/lib/operations/priceEngine.js",
    legacy: ["server/lib/pricing.js"],
    automotive: "server/core/automotiveCore/priceEngine.js",
  },
  stock: {
    primary: "server/lib/operations/stockEngine.js",
    automotive: "server/core/automotiveCore/stockEngine.js",
  },
  return: {
    primary: "server/core/returnRecovery/index.js",
    legacy: ["server/lib/returnsRma.js"],
  },
  country: {
    primary: "server/core/globalCountryRegistry.js",
    legacy: ["data/buzzard_europe_countries.json"],
  },
  safety: {
    primary: "server/core/globalSafetyPolicy.js",
    domain: [
      "server/lib/pim/productionSafetyGate.js",
      "server/lib/supplier/supplierSafetyGate.js",
      "server/lib/operations/adminSafetyGate.js",
      "server/core/automotiveCore/safetyPolicy.js",
      "server/core/automotiveProduction/productionSafety.js",
      "server/core/returnRecovery/safetyGates.js",
    ],
  },
  tecdoc: {
    primary: "server/core/automotiveCore/tecdocAdapter.js",
    legacy: ["server/lib/adapters/tecdocAdapter.js"],
    production: "server/core/automotiveProduction/tecdocConnectorManager.js",
  },
});

function listDuplicateEngines() {
  return {
    duplicateSearchEngines: ENGINES.search.legacy,
    duplicateProductEngines: ENGINES.product.legacy,
    duplicateSupplierEngines: ENGINES.supplier.legacy,
    duplicateOrderEngines: ENGINES.order.legacy,
    duplicateCountryRegistries: ENGINES.country.legacy,
    duplicateSafetyPolicies: ENGINES.safety.domain,
  };
}

function getPrimaryEngine(domain) {
  const entry = ENGINES[domain];
  if (!entry) return null;
  return entry.primary;
}

function resolveEnginePath(relativePath) {
  return path.join(__dirname, "..", "..", relativePath);
}

module.exports = {
  ENGINES,
  listDuplicateEngines,
  getPrimaryEngine,
  resolveEnginePath,
};
