'use strict';

const { evaluateFinalLaunchGovernance } = require('./finalLaunchGovernance');
const { createConnectorFromEnv } = require('../supplier/realSupplierConnector');
const { getEffectiveFlags } = require('../commerce/commerceFeatureFlags');

function redact(value) {
  if (Array.isArray(value)) {
    return value.map(redact);
  }
  if (!value || typeof value !== 'object') {
    return value;
  }
  const secretKeys = new Set([
    'password',
    'passwd',
    'secret',
    'token',
    'apiKey',
    'apikey',
    'authorization',
    'cookie',
    'clientSecret',
    'privateKey',
  ]);
  const output = {};
  for (const [key, current] of Object.entries(value)) {
    if (secretKeys.has(key)) {
      output[key] = '[REDACTED]';
    } else {
      output[key] = redact(current);
    }
  }
  return output;
}

function auditFinalLaunchGovernance(input = {}) {
  const governance = evaluateFinalLaunchGovernance(input);
  const connector = createConnectorFromEnv().getStatus();
  const flags = getEffectiveFlags();

  return Object.freeze({
    auditType: 'FINAL_LAUNCH_GOVERNANCE',
    part: 31,
    readOnly: true,
    diagnosticOnly: true,
    ready: governance.ready,
    status: governance.status,
    blockers: governance.blockedGates,
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
    result: redact(governance),
    generatedAt: new Date().toISOString(),
  });
}

module.exports = {
  auditFinalLaunchGovernance,
  redact,
};
