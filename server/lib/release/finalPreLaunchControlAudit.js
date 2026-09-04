'use strict';

const { evaluateFinalPreLaunchControl } = require('./finalPreLaunchControl');
const { createConnectorFromEnv } = require('../supplier/realSupplierConnector');
const { getEffectiveFlags } = require('../commerce/commerceFeatureFlags');

const SENSITIVE_KEYS = new Set([
  'password',
  'passwd',
  'secret',
  'token',
  'apiKey',
  'apikey',
  'authorization',
  'credentials',
  'privateKey',
  'clientSecret',
  'webhookSecret',
]);

function redact(value) {
  if (Array.isArray(value)) {
    return value.map(redact);
  }
  if (!value || typeof value !== 'object') {
    return value;
  }
  const output = {};
  for (const [key, child] of Object.entries(value)) {
    if (SENSITIVE_KEYS.has(key)) {
      output[key] = '[REDACTED]';
    } else {
      output[key] = redact(child);
    }
  }
  return output;
}

function auditFinalPreLaunchControl(input = {}) {
  const control = evaluateFinalPreLaunchControl(input);
  const connector = createConnectorFromEnv().getStatus();
  const flags = getEffectiveFlags();

  return Object.freeze({
    auditType: 'FINAL_PRELAUNCH_CONTROL',
    part: 33,
    readOnly: true,
    diagnosticOnly: true,
    ready: false,
    status: control.status,
    blockers: control.blockers,
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
    activation: {
      allowed: false,
      performed: false,
      autoActivate: false,
    },
    humanApprovalRequired: true,
    result: redact(control),
    generatedAt: new Date().toISOString(),
  });
}

module.exports = {
  auditFinalPreLaunchControl,
  redact,
};
