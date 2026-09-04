'use strict';
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
function createFinalControlRecoveryAudit(readiness) {
  return Object.freeze({
    auditType: 'FINAL_CONTROL_RECOVERY',
    part: 32,
    readOnly: true,
    diagnosticOnly: true,
    activationAllowed: false,
    autoActivate: false,
    status: 'BLOCKED',
    secretsExposed: false,
    audit: redact(readiness || {}),
  });
}
module.exports = {
  redact,
  createFinalControlRecoveryAudit,
};
