'use strict';
const {
  evaluateFinalOperationalReadiness,
} = require('./finalOperationalReadiness');
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
function runFinalOperationalReadinessAudit(input = {}) {
  const result = evaluateFinalOperationalReadiness(input);
  return Object.freeze({
    auditType: 'PART30_FINAL_OPERATIONAL_READINESS',
    readOnly: true,
    diagnosticOnly: true,
    secretsExposed: false,
    result: redact(result),
  });
}
module.exports = {
  runFinalOperationalReadinessAudit,
  redact,
};
