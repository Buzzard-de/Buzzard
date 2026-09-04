import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  PART34_GATES,
  PART34_POLICY,
} = require('../core/part34FinalLaunchControlConstants.js');
const {
  evaluateFinalLaunchControl,
  validateFinalLaunchControl,
} = require('../lib/release/finalLaunchControl.js');
const {
  auditFinalLaunchControl,
  redact,
} = require('../lib/release/finalLaunchControlAudit.js');

function resetSafeEnv() {
  process.env.BUZZARD_SALES_ENABLED = '0';
  process.env.NEXT_PUBLIC_SALES_ENABLED = '0';
  process.env.REAL_SUPPLIER_LIVE_IMPORT = '0';
  process.env.REAL_SUPPLIER_DRY_RUN = '1';
  delete process.env.REAL_SUPPLIER_API_KEY;
}

function allReadyUpstream() {
  const gates = {};
  for (const name of PART34_GATES) {
    if (name !== 'humanFinalLaunchApproval') {
      gates[name] = { ready: true, status: 'READY', ok: true };
    }
  }
  return gates;
}

test('Part 34 defines 23 gates', () => {
  assert.equal(PART34_GATES.length, 23);
  assert.ok(PART34_GATES.includes('humanFinalLaunchApproval'));
  assert.ok(PART34_GATES.includes('preLaunchControl'));
  assert.ok(PART34_GATES.includes('finalControlRecovery'));
});

test('Part 34 policy is diagnostic only', () => {
  assert.equal(PART34_POLICY.diagnosticOnly, true);
  assert.equal(PART34_POLICY.autoActivate, false);
  assert.equal(PART34_POLICY.activationAllowed, false);
});

test('Final state is always BLOCKED', () => {
  resetSafeEnv();
  const result = evaluateFinalLaunchControl({ gates: allReadyUpstream() });
  assert.equal(result.ready, false);
  assert.equal(result.status, 'BLOCKED');
});

test('Upstream READY states cannot unlock Part 34', () => {
  resetSafeEnv();
  const result = evaluateFinalLaunchControl({ gates: allReadyUpstream() });
  assert.equal(result.ready, false);
  assert.equal(result.activationAllowed, false);
});

test('Human approval cannot unlock activation', () => {
  resetSafeEnv();
  const result = evaluateFinalLaunchControl({
    gates: allReadyUpstream(),
    humanFinalLaunchApproval: true,
  });
  assert.equal(result.activationAllowed, false);
  assert.equal(result.autoActivate, false);
  assert.equal(result.ready, false);
});

test('Human final launch approval gate is blocking', () => {
  resetSafeEnv();
  const result = evaluateFinalLaunchControl();
  const gate = result.gates.find((item) => item.name === 'humanFinalLaunchApproval');
  assert.ok(gate);
  assert.equal(gate.ok, false);
  assert.equal(gate.status, 'BLOCKED');
});

test('Sales remain disabled', () => {
  resetSafeEnv();
  const result = evaluateFinalLaunchControl();
  assert.equal(result.salesEnabled, false);
  assert.equal(result.safety.salesEnabled, false);
});

test('Supplier remains offline', () => {
  resetSafeEnv();
  const result = evaluateFinalLaunchControl();
  assert.equal(result.supplierLive, false);
});

test('Supplier cannot be activated via safety input', () => {
  resetSafeEnv();
  const result = evaluateFinalLaunchControl({
    gates: allReadyUpstream(),
    safety: { supplierLive: true },
  });
  const envGate = result.gates.find((item) => item.name === 'environmentSafety');
  assert.equal(envGate.ok, false);
});

test('Live import blocked via safety input', () => {
  resetSafeEnv();
  const result = evaluateFinalLaunchControl({
    gates: allReadyUpstream(),
    safety: { liveImport: true },
  });
  assert.equal(result.status, 'BLOCKED');
});

test('Publish blocked via safety input', () => {
  resetSafeEnv();
  const result = evaluateFinalLaunchControl({
    gates: allReadyUpstream(),
    safety: { publishEnabled: true },
  });
  assert.equal(result.status, 'BLOCKED');
});

test('Payment activation remains disabled', () => {
  resetSafeEnv();
  const result = evaluateFinalLaunchControl();
  assert.equal(result.safety.paymentActivationAllowed, false);
  assert.equal(result.safety.stripeEnabled, false);
  assert.equal(result.safety.paypalEnabled, false);
});

test('Sales activation remains disabled', () => {
  resetSafeEnv();
  const result = evaluateFinalLaunchControl({
    gates: allReadyUpstream(),
    safety: { salesEnabled: true },
  });
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.safety.salesEnabled, false);
});

test('Audit redacts secrets', () => {
  resetSafeEnv();
  const redacted = redact({ token: 'secret', nested: { password: 'x' }, safe: 'ok' });
  assert.equal(redacted.token, '[REDACTED]');
  assert.equal(redacted.nested.password, '[REDACTED]');
  assert.equal(redacted.safe, 'ok');
});

test('Audit is read-only and exposes no secrets', () => {
  resetSafeEnv();
  const result = auditFinalLaunchControl();
  assert.equal(result.readOnly, true);
  assert.equal(result.diagnosticOnly, true);
  assert.equal(result.secretsExposed, false);
  assert.equal(result.supplier.apiCalled, false);
});

test('Validate is dry-run with no side effects', () => {
  resetSafeEnv();
  const result = validateFinalLaunchControl();
  assert.equal(result.validationOnly, true);
  assert.equal(result.dryRun, true);
  assert.equal(result.mutationPerformed, false);
  assert.equal(result.supplierCallPerformed, false);
  assert.equal(result.paymentCallPerformed, false);
  assert.equal(result.publishPerformed, false);
  assert.equal(result.salesActivationPerformed, false);
});

test('Parts 28-33 upstream integration is present', () => {
  resetSafeEnv();
  const result = evaluateFinalLaunchControl();
  assert.ok(result.upstream.part28);
  assert.ok(result.upstream.part31);
  assert.ok(result.upstream.part32);
  assert.ok(result.upstream.part33);
});

test('Pre-launch control gate integrates Part 33', () => {
  resetSafeEnv();
  const result = evaluateFinalLaunchControl();
  const gate = result.gates.find((item) => item.name === 'preLaunchControl');
  assert.ok(gate);
  assert.equal(gate.source, 'Part 33');
});

test('Final control recovery gate integrates Part 32', () => {
  resetSafeEnv();
  const result = evaluateFinalLaunchControl();
  const gate = result.gates.find((item) => item.name === 'finalControlRecovery');
  assert.ok(gate);
  assert.equal(gate.source, 'Part 32');
});

test('Launch governance gate integrates Part 31', () => {
  resetSafeEnv();
  const result = evaluateFinalLaunchControl();
  const gate = result.gates.find((item) => item.name === 'launchGovernance');
  assert.ok(gate);
  assert.equal(gate.source, 'Part 31');
});

test('Operational readiness gate integrates Part 30', () => {
  resetSafeEnv();
  const result = evaluateFinalLaunchControl();
  const gate = result.gates.find((item) => item.name === 'operationalReadiness');
  assert.ok(gate);
  assert.equal(gate.source, 'Part 30');
});

test('Human approval required flag is set', () => {
  resetSafeEnv();
  const result = evaluateFinalLaunchControl();
  assert.equal(result.humanApprovalRequired, true);
});

test('Fail-closed when upstream gate missing', () => {
  resetSafeEnv();
  const gates = allReadyUpstream();
  delete gates.security;
  const result = evaluateFinalLaunchControl({ gates });
  assert.equal(result.status, 'BLOCKED');
});

test('Public health summary is diagnostic only', () => {
  resetSafeEnv();
  const { getPublicFinalLaunchControlSummary } = require('../lib/release/finalLaunchControl.js');
  const summary = getPublicFinalLaunchControlSummary();
  assert.equal(summary.ready, false);
  assert.equal(summary.diagnosticOnly, true);
  assert.equal(summary.activationAllowed, false);
});

test('RBAC public health route is public', () => {
  const { resolveRoutePermission } = require('../lib/routePermissions.js');
  assert.equal(
    resolveRoutePermission('GET', '/api/health/final-launch-control').public,
    true
  );
});

test('RBAC admin routes require system.read', () => {
  const { resolveRoutePermission } = require('../lib/routePermissions.js');
  assert.equal(
    resolveRoutePermission('GET', '/api/admin/release/final-launch-control').permission,
    'system.read'
  );
  assert.equal(
    resolveRoutePermission('POST', '/api/admin/release/final-launch-control/validate').permission,
    'system.read'
  );
});
