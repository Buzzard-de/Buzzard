"use strict";

const { getFinalGoLiveReadiness } = require("./finalGoLiveReadiness");
const { createConnectorFromEnv } = require("../supplier/realSupplierConnector");
const { getEffectiveFlags } = require("../commerce/commerceFeatureFlags");

function auditFinalGoLive() {
  const readiness = getFinalGoLiveReadiness();
  const connector = createConnectorFromEnv().getStatus();
  const flags = getEffectiveFlags();

  return {
    auditType: "FINAL_GO_LIVE_READINESS",
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
    },
    payments: {
      stripe: flags.stripeEnabled,
      paypal: flags.paypalEnabled,
    },
    sales: {
      enabled: flags.salesEnabled,
    },
    activation: {
      allowed: false,
      performed: false,
    },
    generatedAt: new Date().toISOString(),
  };
}

module.exports = {
  auditFinalGoLive,
};
