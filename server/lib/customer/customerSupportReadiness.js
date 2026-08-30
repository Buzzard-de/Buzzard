/**
 * Part 19 — Customer support readiness.
 */
const fs = require("fs");
const path = require("path");
const customerAuthBridge = require("./customerAuthBridge");

function getSupportReadiness() {
  const supportEnabled = fs.existsSync(path.join(__dirname, "..", "customerSupport.js"));
  return {
    supportModule: supportEnabled,
    customerUi: fs.existsSync(path.join(__dirname, "../../../components/account/AccountSupportPanel.tsx")),
    authBridge: true,
    unifiedCustomerSession: true,
    orderOwnershipCheckRequired: true,
    ticketCreateWhileSalesOff: true,
  };
}

function validateSupportAuth(req) {
  return customerAuthBridge.resolveCustomerSession(req);
}

module.exports = {
  getSupportReadiness,
  validateSupportAuth,
};
