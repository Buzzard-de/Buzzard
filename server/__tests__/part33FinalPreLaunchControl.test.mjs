import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  PART33_GATES,
  PART33_POLICY,
} = require('../core/part33FinalPreLaunchControlConstants.js');
const {
  evaluateFinalPreLaunchControl,
  validateFinalPreLaunchControl,
} = require('../lib/release/finalPreLaunchControl.js');
const {
  auditFinalPreLaunchControl,
  redact,
} = require('../lib/release/finalPreLaunchControlAudit.js');

function resetSafeEnv() {
  process.env.BUZZARD_SALES_ENABLED = '0';
  process.env.NEXT_PUBLIC_SALES_ENABLED = '0';
  process.env.REAL_SUPPLIER_LIVE_IMPORT = '0';
  process.env.REAL_SUPPLIER_DRY_RUN = '1';
  delete process.env.REAL_SUPPLIER_API_KEY;
}

function allReadyUpstream() {
  const gates = {};
  for (const name of PART33_GATES) {
    if (name !== 'humanFinalPreLaunchApproval') {
      gates[name] = { ready: true, status: 'READY', ok: true };
    }
  }
  return gates;
}

test('Part 33 defines 21 gates', () => {
  assert.equal(PART33_GATES.length, 21);
  assert.ok(PART33_GATES.includes('humanFinalPreLaunchApproval'));
  assert.ok(PART33_GATES.includes('incidentResponse'));
});

test('Part 33 policy is diagnostic only', () => {
  assert.equal(PART33_POLICY.diagnosticOnly, true);
  assert.equal(PART33_POLICY.autoActivate, false);
  assert.equal(PART33_POLICY.activationAllowed, false);
});

test('Final state is always BLOCKED', () => {
  resetSafeEnv();
  const result = evaluateFinalPreLaunchControl({ gates: allReadyUpstream() });
  assert.equal(result.ready, false);
  assert.equal(result.status, 'BLOCKED');
});

test('Human approval cannot unlock activation', () => {
  resetSafeEnv();
  const result = evaluateFinalPreLaunchControl({
    gates: allReadyUpstream(),
    humanFinalPreLaunchApproval: true,
  });
  assert.equal(result.activationAllowed, false);
  assert.equal(result.autoActivate, false);
  assert.equal(result.ready, false);
});

test('Human final pre-launch approval gate is blocking', () => {
  resetSafeEnv();
  const result = evaluateFinalPreLaunchControl();
  const gate = result.gates.find((item) => item.name === 'humanFinalPreLaunchApproval');
  assert.ok(gate);
  assert.equal(gate.ok, false);
  assert.equal(gate.status, 'BLOCKED');
});

test('Sales remain disabled', () => {
  resetSafeEnv();
  const result = evaluateFinalPreLaunchControl();
  assert.equal(result.salesEnabled, false);
  assert.equal(result.safety.salesEnabled, false);
});

test('Supplier remains offline', () => {
  resetSafeEnv();
  const result = evaluateFinalPreLaunchControl();
  assert.equal(result.supplierLive, false);
});

test('Supplier cannot be activated via safety input', () => {
  resetSafeEnv();
  const result = evaluateFinalPreLaunchControl({
    gates: allReadyUpstream(),
    safety: { supplierLive: true },
  });
  const envGate = result.gates.find((item) => item.name === 'environmentSafety');
  assert.equal(envGate.ok, false);
});

test('Live import blocked via safety input', () => {
  resetSafeEnv();
  const result = evaluateFinalPreLaunchControl({
    gates: allReadyUpstream(),
    safety: { liveImport: true },
  });
  assert.equal(result.status, 'BLOCKED');
});

test('Publish blocked via safety input', () => {
  resetSafeEnv();
  const result = evaluateFinalPreLaunchControl({
    gates: allReadyUpstream(),
    safety: { publishEnabled: true },
  });
  assert.equal(result.status, 'BLOCKED');
});

test('Payment activation remains disabled', () => {
  resetSafeEnv();
  const result = evaluateFinalPreLaunchControl();
  assert.equal(result.safety.paymentActivationAllowed, false);
  assert.equal(result.safety.stripeEnabled, false);
  assert.equal(result.safety.paypalEnabled, false);
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
  const result = auditFinalPreLaunchControl();
  assert.equal(result.readOnly, true);
  assert.equal(result.diagnosticOnly, true);
  assert.equal(result.secretsExposed, false);
  assert.equal(result.supplier.apiCalled, false);
});

test('Validate is dry-run with no side effects', () => {
  resetSafeEnv();
  const result = validateFinalPreLaunchControl();
  assert.equal(result.validationOnly, true);
  assert.equal(result.dryRun, true);
  assert.equal(result.mutationPerformed, false);
  assert.equal(result.supplierCallPerformed, false);
  assert.equal(result.paymentCallPerformed, false);
  assert.equal(result.publishPerformed, false);
  assert.equal(result.salesActivationPerformed, false);
});

test('Parts 28-32 upstream integration is present', () => {
  resetSafeEnv();
  const result = evaluateFinalPreLaunchControl();
  assert.ok(result.upstream.part28);
  assert.ok(result.upstream.part31);
  assert.ok(result.upstream.part32);
});

test('Launch governance gate integrates Part 31', () => {
  resetSafeEnv();
  const result = evaluateFinalPreLaunchControl();
  const gate = result.gates.find((item) => item.name === 'launchGovernance');
  assert.ok(gate);
  assert.equal(gate.source, 'Part 31');
});

test('Operational readiness gate integrates Part 30', () => {
  resetSafeEnv();
  const result = evaluateFinalPreLaunchControl();
  const gate = result.gates.find((item) => item.name === 'operationalReadiness');
  assert.ok(gate);
  assert.equal(gate.source, 'Part 30');
});

test('Human approval required flag is set', () => {
  resetSafeEnv();
  const result = evaluateFinalPreLaunchControl();
  assert.equal(result.humanApprovalRequired, true);
});

test('Fail-closed when upstream gate missing', () => {
  resetSafeEnv();
  const gates = allReadyUpstream();
  delete gates.security;
  const result = evaluateFinalPreLaunchControl({ gates });
  assert.equal(result.status, 'BLOCKED');
});

test('RBAC public health route is public', () => {
  const { resolveRoutePermission } = require('../lib/routePermissions.js');
  assert.equal(
    resolveRoutePermission('GET', '/api/health/final-prelaunch-control').public,
    true
  );
});

test('RBAC admin routes require system.read', () => {
  const { resolveRoutePermission } = require('../lib/routePermissions.js');
  assert.equal(
    resolveRoutePermission('GET', '/api/admin/release/final-prelaunch-control').permission,
    'system.read'
  );
  assert.equal(
    resolveRoutePermission('POST', '/api/admin/release/final-prelaunch-control/validate').permission,
    'system.read'
  );
});
