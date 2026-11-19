/**
 * Single operational snapshot for automation modules (dry-run).
 */
const marketplaceRegistry = require("../marketplace/marketplaceConnectorRegistry");
const paymentRegistry = require("../finance/paymentConnectorRegistry");
const { status: tecdoc } = require("../adapters/tecdocSandboxService");
const { validateHubSeoCoverage } = require("../storefront/hubSeoLocaleService");
const supplierAdapters = require("../adapters/supplierAdapter");
const { runSyntheticCustomerJourney } = require("../commerce/syntheticCustomerJourney");
const shippingRegistry = require("../logistics/shippingConnectorRegistry");
const pricingAnomalyService = require("../pricing/pricingAnomalyService");
const pusatAutomationHealth = require("../pusat/automationHealth");
const financeOpsSnapshot = require("../finance/financeOpsSnapshot");

function buildIntegrationSnapshots() {
  const journey = runSyntheticCustomerJourney();
  return {
    live: false,
    productionReady: false,
    salesEnabled: false,
    marketplace: marketplaceRegistry.snapshot(),
    payments: paymentRegistry.snapshot(),
    tecdoc,
    hubSeo: validateHubSeoCoverage(),
    shipping: shippingRegistry.snapshot(),
    pricingAnomaly: pricingAnomalyService.snapshot(),
    pusatAutomation: pusatAutomationHealth.snapshot(),
    financeOps: financeOpsSnapshot.snapshot(),
    suppliers: { adapters: supplierAdapters.listAdapters(), liveImport: false },
    syntheticJourney: { ok: journey.ok, steps: journey.stepCount },
  };
}

module.exports = { buildIntegrationSnapshots };