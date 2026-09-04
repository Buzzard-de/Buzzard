"use strict";

const { getFinalPreLaunchAudit } = require("./finalPreLaunchAudit");
const { createConnectorFromEnv } = require("../supplier/realSupplierConnector");
const { getEffectiveFlags } = require("../commerce/commerceFeatureFlags");

async function auditFinalPreLaunch() {
  const readiness = await getFinalPreLaunchAudit();
  const connector = createConnectorFromEnv().getStatus();
  const flags = getEffectiveFlags();

  return {
    auditType: "FINAL_PRE_LAUNCH_AUDIT",
    part: 29,
    readOnly: true,
    diagnosticOnly: true,
    ready: readiness.ready,
    status: readiness.status,
    blockers: readiness.blockers,
    secretsExposed: false,
    supplier: {
      credentialsConfigured: connector.credentialsConfigured,
      connected: false,
      apiCalled: false,
      liveImport: connector.liveImportEnabled,
      verificationOnly: true,
    },
    payments: {
      stripe: flags.stripeEnabled,
      paypal: flags.paypalEnabled,
      verificationOnly: true,
    },
    sales: {
      enabled: flags.salesEnabled,
    },
    activation: {
      allowed: false,
      performed: false,
      autoActivate: false,
    },
    humanApprovalRequired: true,
    generatedAt: new Date().toISOString(),
  };
}

module.exports = {
  auditFinalPreLaunch,
};
