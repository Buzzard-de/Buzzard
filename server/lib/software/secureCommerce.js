/**
 * Facade for secure payment + delivery protection.
 * Reuses Pusat and existing software engines. Not a second orchestrator.
 */

const constants = require("./secureCommerceConstants");
const paymentLifecycle = require("./paymentLifecycle");
const paymentProviders = require("./paymentProviders");
const reserveTransfers = require("./reserveTransfers");
const paymentRisk = require("./paymentRisk");
const orderConfirmation = require("./orderConfirmation");
const identitySignals = require("./identitySignals");
const signaturePolicy = require("./signaturePolicy");
const deliveryProof = require("./deliveryProof");
const locationEvidence = require("./locationEvidence");
const shipmentGate = require("./shipmentGate");
const disputes = require("./disputes");
const dualPaymentEngine = require("../commerce/providers/dualPaymentEngine");

function flags() {
  const commerce = require("../commerce/commerceFeatureFlags").getEffectiveFlags();
  return {
    salesEnabled: commerce.salesEnabled,
    transferExecution: process.env.BUZZARD_TRANSFER_EXECUTION === "1" && commerce.salesEnabled,
    confirmationRequired: process.env.BUZZARD_CUSTOMER_CONFIRMATION_REQUIRED !== "0",
    productSotActive: commerce.productSotActive,
    productSotEnvFlag: commerce.productSotEnvFlag,
    livePaymentsEnabled: commerce.livePaymentsEnabled,
    realMoneyMovement: false,
  };
}

module.exports = {
  constants,
  flags,
  paymentLifecycle,
  paymentProviders,
  reserveTransfers,
  paymentRisk,
  orderConfirmation,
  identitySignals,
  signaturePolicy,
  deliveryProof,
  locationEvidence,
  shipmentGate,
  disputes,
  dualPaymentEngine,
};
