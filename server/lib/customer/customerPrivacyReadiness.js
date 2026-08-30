/**
 * Part 19 — GDPR / privacy operational readiness.
 */
const customerStore = require("../customerStore");
const goLiveApproval = require("../commerce/goLiveApproval");

function getPrivacyReadiness() {
  let identityPrivacy = false;
  try {
    const identitySecurity = require("../identitySecurity");
    identityPrivacy = typeof identitySecurity.createPrivacyRequest === "function";
  } catch {
    identityPrivacy = false;
  }

  return {
    accountExportRoute: "GET /api/account/export",
    accountDeletionRoute: "POST /api/account/deletion-request",
    identityPrivacyModule: identityPrivacy,
    fileBasedCustomerStore: true,
    autoErasurePipeline: false,
    deletionIsFlagOnly: true,
    requiresHumanApproval: true,
    goLiveLock: goLiveApproval.PRODUCTION_SAFETY_LOCK,
    inventPii: false,
  };
}

function bridgePrivacyExport(customerId) {
  const exportData = customerStore.exportCustomerData(customerId);
  if (!exportData) return null;
  return {
    ...exportData,
    exportedAt: new Date().toISOString(),
    testOnly: false,
    redactedSecrets: true,
  };
}

function bridgeDeletionRequest(customerId) {
  const requestedAt = customerStore.requestDeletion(customerId);
  return {
    customerId,
    requestedAt,
    status: "PENDING_HUMAN_REVIEW",
    autoExecuted: false,
  };
}

module.exports = {
  getPrivacyReadiness,
  bridgePrivacyExport,
  bridgeDeletionRequest,
};
