import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  evaluateFinalLaunchGovernance,
  validateFinalLaunchGovernance,
} = require('../lib/release/finalLaunchGovernance.js');
const { auditFinalLaunchGovernance } = require('../lib/release/finalLaunchGovernanceAudit.js');
const { PART31_GATES } = require('../core/part31LaunchGovernanceConstants.js');

function resetSafeEnv() {
  process.env.BUZZARD_SALES_ENABLED = '0';
  process.env.NEXT_PUBLIC_SALES_ENABLED = '0';
  process.env.REAL_SUPPLIER_LIVE_IMPORT = '0';
  process.env.REAL_SUPPLIER_DRY_RUN = '1';
  delete process.env.REAL_SUPPLIER_API_KEY;
}

function allReadyGates() {
  const gates = {};
  for (const gate of PART31_GATES) {
    if (gate !== 'humanLaunchApproval' && gate !== 'finalOperationalReadiness') {
      gates[gate] = { status: 'READY' };
    }
  }
  gates.finalOperationalReadiness = { status: 'READY', source: 'Part 30' };
  return gates;
}

test('Part 31 exposes all required gates', () => {
  assert.equal(PART31_GATES.length, 20);
  assert.ok(PART31_GATES.includes('finalOperationalReadiness'));
  assert.ok(PART31_GATES.includes('finalPreLaunchAudit'));
  assert.ok(PART31_GATES.includes('humanLaunchApproval'));
});

test('Part 31 is fail-closed without input', () => {
  resetSafeEnv();
  const result = evaluateFinalLaunchGovernance();
  assert.equal(result.ready, false);
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.activationAllowed, false);
  assert.equal(result.autoActivate, false);
});

test('Part 31 is diagnostic only', () => {
  resetSafeEnv();
  const result = evaluateFinalLaunchGovernance();
  assert.equal(result.diagnosticOnly, true);
});

test('Human launch approval is mandatory', () => {
  resetSafeEnv();
  const result = evaluateFinalLaunchGovernance({ gates: allReadyGates() });
  assert.equal(result.ready, false);
  assert.equal(result.gates.humanLaunchApproval.status, 'BLOCKED');
});

test('Human approval does not enable activation', () => {
  resetSafeEnv();
  const result = evaluateFinalLaunchGovernance({
    gates: allReadyGates(),
    humanLaunchApproval: true,
  });
  assert.equal(result.ready, false);
  assert.equal(result.activationAllowed, false);
  assert.equal(result.autoActivate, false);
  assert.equal(result.salesEnabled, false);
  assert.equal(result.supplierLive, false);
});

test('Sales remain disabled', () => {
  resetSafeEnv();
  const result = evaluateFinalLaunchGovernance();
  assert.equal(result.salesEnabled, false);
  assert.equal(result.safety.salesEnabled, false);
});

test('Supplier remains disconnected', () => {
  resetSafeEnv();
  const result = evaluateFinalLaunchGovernance();
  assert.equal(result.supplierLive, false);
  assert.equal(result.safety.supplierOrdersBlocked, true);
});

test('Supplier API is not called', () => {
  resetSafeEnv();
  const result = validateFinalLaunchGovernance();
  assert.equal(result.supplierCallPerformed, false);
});

test('Live import remains disabled', () => {
  resetSafeEnv();
  const result = evaluateFinalLaunchGovernance();
  assert.equal(result.safety.liveImport, false);
});

test('Stripe and PayPal remain disabled', () => {
  resetSafeEnv();
  const result = evaluateFinalLaunchGovernance();
  assert.equal(result.safety.stripeEnabled, false);
  assert.equal(result.safety.paypalEnabled, false);
});

test('Publishing remains disabled', () => {
  resetSafeEnv();
  const result = evaluateFinalLaunchGovernance();
  assert.equal(result.safety.publishEnabled, false);
});

test('Environment safety gate passes in safe state', () => {
  resetSafeEnv();
  const result = evaluateFinalLaunchGovernance({ gates: allReadyGates() });
  assert.equal(result.gates.environmentSafety.status, 'READY');
});

test('Sales activation in safety input is blocked', () => {
  resetSafeEnv();
  const result = evaluateFinalLaunchGovernance({
    gates: allReadyGates(),
    safety: { salesEnabled: true },
  });
  assert.equal(result.status, 'BLOCKED');
  assert.ok(result.blockedGates.includes('environmentSafety'));
});

test('Supplier live in safety input is blocked', () => {
  resetSafeEnv();
  const result = evaluateFinalLaunchGovernance({
    gates: allReadyGates(),
    safety: { supplierLive: true },
  });
  assert.equal(result.status, 'BLOCKED');
});

test('Missing upstream gate is blocked', () => {
  resetSafeEnv();
  const gates = allReadyGates();
  delete gates.security;
  const result = evaluateFinalLaunchGovernance({ gates });
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.gates.security.status, 'BLOCKED');
});

test('Invalid upstream gate status is blocked', () => {
  resetSafeEnv();
  const gates = allReadyGates();
  gates.monitoring = { status: 'INVALID' };
  const result = evaluateFinalLaunchGovernance({ gates });
  assert.equal(result.status, 'BLOCKED');
});

test('Condition propagates without becoming ready', () => {
  resetSafeEnv();
  const gates = allReadyGates();
  gates.monitoring = { status: 'CONDITION', reason: 'monitoring-condition' };
  const result = evaluateFinalLaunchGovernance({ gates });
  assert.equal(result.ready, false);
  assert.equal(result.status, 'BLOCKED');
  assert.ok(result.conditionGates.includes('monitoring'));
});

test('Blocked gate dominates conditions', () => {
  resetSafeEnv();
  const gates = allReadyGates();
  gates.monitoring = { status: 'CONDITION' };
  gates.security = { status: 'BLOCKED' };
  const result = evaluateFinalLaunchGovernance({ gates });
  assert.equal(result.status, 'BLOCKED');
});

test('Final operational readiness gate exists', () => {
  resetSafeEnv();
  const result = evaluateFinalLaunchGovernance();
  assert.ok(result.gates.finalOperationalReadiness);
  assert.equal(result.gates.finalOperationalReadiness.source, 'Part 30');
});

test('Validation performs no mutation', () => {
  resetSafeEnv();
  const result = validateFinalLaunchGovernance();
  assert.equal(result.validationOnly, true);
  assert.equal(result.mutationPerformed, false);
  assert.equal(result.publishPerformed, false);
  assert.equal(result.salesActivationPerformed, false);
  assert.equal(result.goLiveLockRemoved, false);
});

test('Audit is read-only and redacts secrets', () => {
  resetSafeEnv();
  const result = auditFinalLaunchGovernance({ gates: allReadyGates() });
  assert.equal(result.readOnly, true);
  assert.equal(result.diagnosticOnly, true);
  assert.equal(result.secretsExposed, false);
});

test('Final state cannot authorize activation', () => {
  resetSafeEnv();
  const result = evaluateFinalLaunchGovernance({
    gates: allReadyGates(),
    humanLaunchApproval: true,
  });
  assert.equal(result.activationAllowed, false);
  assert.equal(result.ready, false);
  assert.equal(result.humanApprovalRequired, true);
});

test('RBAC public health route is public', () => {
  const { resolveRoutePermission } = require('../lib/routePermissions.js');
  assert.equal(
    resolveRoutePermission('GET', '/api/health/final-launch-governance').public,
    true
  );
});

test('RBAC admin governance routes require system.read', () => {
  const { resolveRoutePermission } = require('../lib/routePermissions.js');
  assert.equal(
    resolveRoutePermission('GET', '/api/admin/release/final-launch-governance').permission,
    'system.read'
  );
  assert.equal(
    resolveRoutePermission('POST', '/api/admin/release/final-launch-governance/validate').permission,
    'system.read'
  );
});
