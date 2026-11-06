/**
 * Buzzard carrier integration engine registry. Mock/sandbox only.
 */
const { createAdapter, priorityCatalog, API_LEVELS } = require("./adapterFramework");
const { selectCarrier } = require("./selectionEngine");
const { lookupCoverage, countryCoverageMatrix } = require("./coverageEngine");
const { audit, listAudit } = require("./auditLog");
const { receiveWebhook } = require("./webhookReceiver");
const { startReturn } = require("./returnsEngine");
const { policy, credentialRegistry, healthMonitor, locateNetworks } = require("./securityPolicy");

const COMPONENTS = Object.freeze([
  "Carrier Registry",
  "Carrier Identity Resolver",
  "Carrier Capability Registry",
  "Carrier API Adapter Framework",
  "Carrier Rate Engine",
  "Carrier Label Engine",
  "Carrier Tracking Engine",
  "Carrier Pickup Engine",
  "Carrier Returns Engine",
  "Carrier Webhook Receiver",
  "Carrier Fallback Engine",
  "Postal Code Coverage Engine",
  "Locker/PUDO Locator",
  "Carrier Performance Monitor",
  "Carrier Contract Registry",
  "Carrier Credential Registry",
  "Carrier Health Monitor",
  "Carrier Audit Log",
  "Carrier Reconciliation Engine",
  "Carrier Cost Optimizer",
  "Delivery Promise Engine",
  "Exception Management Engine",
]);

function engineStatus() {
  return {
    liveShipment: false,
    salesEnabled: false,
    productionCredentials: false,
    components: COMPONENTS.map((name) => ({
      name,
      status: "CODE_READY_MOCK",
      live: false,
    })),
    apiLevels: API_LEVELS,
    documentedAdapters: priorityCatalog(),
    technicallyUsableLiveCarriers: 0,
    sandboxVerifiedCarriers: 0,
  };
}

function costModel() {
  return {
    baseRate: "UNKNOWN",
    regionalSurcharge: "UNKNOWN",
    fuelSurcharge: "UNKNOWN",
    remoteSurcharge: "UNKNOWN",
    sizeWeightSurcharge: "UNKNOWN",
    returnFee: "UNKNOWN",
    lockerFee: "UNKNOWN",
    insuranceFee: "UNKNOWN",
    extraFee: "UNKNOWN",
    livePrice: false,
    historicalPrice: "UNKNOWN",
    estimatedNotShownAsLive: true,
  };
}

function performanceModel() {
  return {
    firstDeliverySuccess: "UNKNOWN",
    averageTransitDays: "UNKNOWN",
    delayRate: "UNKNOWN",
    lossRate: "UNKNOWN",
    damageRate: "UNKNOWN",
    returnDuration: "UNKNOWN",
    trackingUpdateFrequency: "UNKNOWN",
  };
}

module.exports = {
  COMPONENTS,
  engineStatus,
  createAdapter,
  selectCarrier,
  lookupCoverage,
  countryCoverageMatrix,
  costModel,
  performanceModel,
  audit,
  listAudit,
  receiveWebhook,
  startReturn,
  policy,
  credentialRegistry,
  healthMonitor,
  locateNetworks,
};
