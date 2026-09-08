/**
 * Automotive Core — health metrics (diagnostic only).
 */
const categoryEngine = require("./categoryEngine");
const supplierEngine = require("./supplierEngine");
const { getTecDocStatus } = require("./tecdocAdapter");
const { assertAutomotiveCoreSafety } = require("./safetyPolicy");
const { GLOBAL_SAFETY_POLICY } = require("../globalSafetyPolicy");

function buildAutomotiveHealth(options = {}) {
  const stats = categoryEngine.getCategoryStats();
  const supplier = supplierEngine.getSupplierStatus();
  const tecdoc = getTecDocStatus();
  const safety = assertAutomotiveCoreSafety();
  const productStats = options.productStats || {};

  return {
    timestamp: new Date().toISOString(),
    engine: "automotive_core",
    categoriesTotal: stats.topLevel || 12,
    categoriesActive: stats.topLevel || 12,
    subcategoriesTotal: stats.subcategories || 0,
    productTypesTotal: stats.productTypes || 0,
    productsTotal: productStats.total || 0,
    productsValidated: productStats.validated || 0,
    productsReview: productStats.review || 0,
    productsApproved: productStats.approved || 0,
    productsPublished: productStats.published || 0,
    productsMissingImages: productStats.missingImages || 0,
    productsMissingIdentifiers: productStats.missingIdentifiers || 0,
    productsMissingFitment: productStats.missingFitment || 0,
    supplierCount: supplier.count,
    supplierConnected: false,
    supplierLive: supplier.live,
    apiConfigured: supplier.apiConfigured,
    xmlConfigured: supplier.xmlConfigured,
    tecdocConfigured: tecdoc.configured,
    tecdocMode: tecdoc.mode,
    searchReady: true,
    salesEnabled: GLOBAL_SAFETY_POLICY.salesEnabled,
    paymentsEnabled: GLOBAL_SAFETY_POLICY.paymentsEnabled,
    publishEnabled: GLOBAL_SAFETY_POLICY.publishEnabled,
    safety,
    diagnosticOnly: true,
  };
}

module.exports = {
  buildAutomotiveHealth,
};
