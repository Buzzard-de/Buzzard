import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const {
  PART32_GATES,
  PART32_POLICY,
} = require('../core/part32FinalControlRecoveryConstants.js');
const {
  evaluateFinalControlRecoveryReadiness,
} = require('../lib/release/finalControlRecoveryReadiness.js');
const {
  redact,
  createFinalControlRecoveryAudit,
} = require('../lib/release/finalControlRecoveryAudit.js');
test('Part 32 defines 20 gates', () => {
  assert.equal(PART32_GATES.length, 20);
});
test('Part 32 is diagnostic only', () => {
  assert.equal(PART32_POLICY.diagnosticOnly, true);
});
test('Part 32 cannot auto activate', () => {
  assert.equal(PART32_POLICY.autoActivate, false);
  assert.equal(PART32_POLICY.activationAllowed, false);
});
test('Final decision is always BLOCKED', () => {
  const result = evaluateFinalControlRecoveryReadiness({
    gates: Object.fromEntries(
      PART32_GATES.map((name) => [name, { ready: true }])
    ),
  });
  assert.equal(result.ready, false);
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.activationAllowed, false);
});
test('Human approval remains mandatory', () => {
  const result = evaluateFinalControlRecoveryReadiness();
  const gate = result.gates.find(
    (item) => item.name === 'humanFinalControlApproval'
  );
  assert.equal(gate.ready, false);
  assert.equal(
    gate.reason,
    'HUMAN_FINAL_CONTROL_APPROVAL_REQUIRED'
  );
});
test('Supplier remains offline', () => {
  const result = evaluateFinalControlRecoveryReadiness();
  assert.equal(result.supplierLive, false);
});
test('Sales remains disabled', () => {
  const result = evaluateFinalControlRecoveryReadiness();
  assert.equal(result.salesEnabled, false);
});
test('Payment activation remains disabled', () => {
  const result = evaluateFinalControlRecoveryReadiness();
  assert.equal(result.paymentActivationAllowed, false);
});
test('Publish remains disabled', () => {
  const result = evaluateFinalControlRecoveryReadiness();
  assert.equal(result.publishAllowed, false);
});
test('Sensitive audit values are redacted', () => {
  const result = redact({
    token: 'secret-value',
    nested: {
      password: 'password-value',
    },
    safe: 'visible',
  });
  assert.equal(result.token, '[REDACTED]');
  assert.equal(result.nested.password, '[REDACTED]');
  assert.equal(result.safe, 'visible');
});
test('Audit remains diagnostic-only', () => {
  const result = createFinalControlRecoveryAudit({
    ready: false,
    status: 'BLOCKED',
    token: 'secret',
  });
  assert.equal(result.diagnosticOnly, true);
  assert.equal(result.activationAllowed, false);
  assert.equal(result.autoActivate, false);
  assert.equal(result.audit.token, '[REDACTED]');
});
test('Gate evaluation is fail-closed for missing context', () => {
  const result = evaluateFinalControlRecoveryReadiness();
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.ready, false);
});
test('All gates expose deterministic status', () => {
  const result = evaluateFinalControlRecoveryReadiness();
  assert.equal(result.gates.length, 20);
  for (const gate of result.gates) {
    assert.ok(
      gate.status === 'BLOCKED' ||
      gate.status === 'READY'
    );
  }
});
test('RBAC public health route is public', () => {
  const { resolveRoutePermission } = require('../lib/routePermissions.js');
  assert.equal(
    resolveRoutePermission('GET', '/api/health/final-control-recovery').public,
    true
  );
});
test('RBAC admin control recovery routes require system.read', () => {
  const { resolveRoutePermission } = require('../lib/routePermissions.js');
  assert.equal(
    resolveRoutePermission('GET', '/api/admin/release/final-control-recovery').permission,
    'system.read'
  );
  assert.equal(
    resolveRoutePermission('POST', '/api/admin/release/final-control-recovery/validate').permission,
    'system.read'
  );
});
