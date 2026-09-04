import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const {
  evaluateFinalOperationalReadiness,
} = require('../lib/release/finalOperationalReadiness');
const {
  runFinalOperationalReadinessAudit,
} = require('../lib/release/finalOperationalReadinessAudit');
const {
  PART30_GATES,
} = require('../core/part30OperationalReadinessConstants');
function allReadyGates() {
  const gates = {};
  for (const gate of PART30_GATES) {
    if (gate !== 'humanOperationalApproval') {
      gates[gate] = {
        status: 'READY',
      };
    }
  }
  return gates;
}
test('Part 30 exposes all required gates', () => {
  assert.equal(PART30_GATES.length, 19);
  assert.ok(PART30_GATES.includes('finalPreLaunchAudit'));
  assert.ok(PART30_GATES.includes('humanOperationalApproval'));
});
test('Part 30 is fail-closed without input', () => {
  const result = evaluateFinalOperationalReadiness();
  assert.equal(result.ready, false);
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.activationAllowed, false);
  assert.equal(result.autoActivate, false);
});
test('Human operational approval is mandatory', () => {
  const result = evaluateFinalOperationalReadiness({
    gates: allReadyGates(),
  });
  assert.equal(result.ready, false);
  assert.equal(result.status, 'BLOCKED');
  assert.equal(
    result.gates.humanOperationalApproval.status,
    'BLOCKED'
  );
});
test('Human approval does not enable activation automatically', () => {
  const result = evaluateFinalOperationalReadiness({
    gates: allReadyGates(),
    humanOperationalApproval: true,
  });
  assert.equal(result.ready, false);
  assert.equal(result.activationAllowed, false);
  assert.equal(result.autoActivate, false);
  assert.equal(result.salesEnabled, false);
  assert.equal(result.supplierLive, false);
});
test('Sales enabled is blocked', () => {
  const result = evaluateFinalOperationalReadiness({
    gates: allReadyGates(),
    humanOperationalApproval: true,
    safety: {
      salesEnabled: true,
    },
  });
  assert.equal(result.status, 'BLOCKED');
  assert.ok(result.blockedGates.includes('environmentSafety'));
});
test('Supplier live is blocked', () => {
  const result = evaluateFinalOperationalReadiness({
    gates: allReadyGates(),
    humanOperationalApproval: true,
    safety: {
      supplierLive: true,
    },
  });
  assert.equal(result.status, 'BLOCKED');
});
test('Live import is blocked', () => {
  const result = evaluateFinalOperationalReadiness({
    gates: allReadyGates(),
    humanOperationalApproval: true,
    safety: {
      liveImport: true,
    },
  });
  assert.equal(result.status, 'BLOCKED');
});
test('Publish is blocked', () => {
  const result = evaluateFinalOperationalReadiness({
    gates: allReadyGates(),
    humanOperationalApproval: true,
    safety: {
      publishEnabled: true,
    },
  });
  assert.equal(result.status, 'BLOCKED');
});
test('Auto activation is always false', () => {
  const result = evaluateFinalOperationalReadiness({
    gates: allReadyGates(),
    humanOperationalApproval: true,
    safety: {
      autoActivate: true,
    },
  });
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.autoActivate, false);
  assert.equal(result.activationAllowed, false);
});
test('Missing upstream gate is blocked', () => {
  const gates = allReadyGates();
  delete gates.security;
  const result = evaluateFinalOperationalReadiness({
    gates,
    humanOperationalApproval: true,
  });
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.gates.security.status, 'BLOCKED');
});
test('Invalid upstream gate status is blocked', () => {
  const gates = allReadyGates();
  gates.monitoring = {
    status: 'INVALID',
  };
  const result = evaluateFinalOperationalReadiness({
    gates,
    humanOperationalApproval: true,
  });
  assert.equal(result.status, 'BLOCKED');
});
test('Condition propagates without becoming ready', () => {
  const gates = allReadyGates();
  gates.monitoring = {
    status: 'CONDITION',
    reason: 'monitoring-condition',
  };
  const result = evaluateFinalOperationalReadiness({
    gates,
    humanOperationalApproval: true,
  });
  assert.equal(result.ready, false);
  assert.equal(result.status, 'CONDITION');
  assert.ok(result.conditionGates.includes('monitoring'));
});
test('Blocked gate dominates conditions', () => {
  const gates = allReadyGates();
  gates.monitoring = {
    status: 'CONDITION',
  };
  gates.security = {
    status: 'BLOCKED',
  };
  const result = evaluateFinalOperationalReadiness({
    gates,
    humanOperationalApproval: true,
  });
  assert.equal(result.status, 'BLOCKED');
});
test('Safety state remains disabled', () => {
  const result = evaluateFinalOperationalReadiness({
    gates: allReadyGates(),
    humanOperationalApproval: true,
  });
  assert.deepEqual(result.safety, {
    salesEnabled: false,
    supplierLive: false,
    liveImport: false,
    publishEnabled: false,
    autoActivate: false,
    activationAllowed: false,
  });
});
test('Supplier cannot become live through readiness', () => {
  const result = evaluateFinalOperationalReadiness({
    gates: allReadyGates(),
    humanOperationalApproval: true,
    supplierLive: true,
  });
  assert.equal(result.supplierLive, false);
});
test('Sales cannot become enabled through readiness', () => {
  const result = evaluateFinalOperationalReadiness({
    gates: allReadyGates(),
    humanOperationalApproval: true,
    salesEnabled: true,
  });
  assert.equal(result.salesEnabled, false);
});
test('Diagnostic-only invariant is permanent', () => {
  const result = evaluateFinalOperationalReadiness({
    gates: allReadyGates(),
    humanOperationalApproval: true,
  });
  assert.equal(result.diagnosticOnly, true);
  assert.equal(result.autoActivate, false);
  assert.equal(result.activationAllowed, false);
});
test('Audit is read-only', () => {
  const result = runFinalOperationalReadinessAudit({
    gates: allReadyGates(),
  });
  assert.equal(result.readOnly, true);
  assert.equal(result.diagnosticOnly, true);
  assert.equal(result.secretsExposed, false);
});
test('Audit redacts secret-like fields', () => {
  const result = runFinalOperationalReadinessAudit({
    gates: allReadyGates(),
    secret: 'do-not-expose',
  });
  assert.equal(result.secretsExposed, false);
  assert.equal(result.result.secretsExposed, false);
});
test('Final state cannot authorize activation', () => {
  const result = evaluateFinalOperationalReadiness({
    gates: allReadyGates(),
    humanOperationalApproval: true,
  });
  assert.equal(result.activationAllowed, false);
  assert.equal(result.ready, false);
});
test('RBAC public health route is public', () => {
  const { resolveRoutePermission } = require('../lib/routePermissions.js');
  assert.equal(
    resolveRoutePermission('GET', '/api/health/final-operational-readiness').public,
    true
  );
});
test('RBAC admin final operational routes require system.read', () => {
  const { resolveRoutePermission } = require('../lib/routePermissions.js');
  assert.equal(
    resolveRoutePermission('GET', '/api/admin/release/final-operational-readiness').permission,
    'system.read'
  );
  assert.equal(
    resolveRoutePermission('POST', '/api/admin/release/final-operational-readiness/validate').permission,
    'system.read'
  );
});
