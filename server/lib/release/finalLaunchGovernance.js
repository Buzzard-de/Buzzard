'use strict';

/**
 * Part 31 — Final Launch Governance
 *
 * Diagnostic-only. Fail-closed. Consumes upstream readiness from Parts 16–30.
 * No activation, no supplier connect, no payment/sales enablement.
 */
const {
  PART31_VERSION,
  PART31_STATUS,
  PART31_GATES,
  PART31_POLICY,
  blocked,
} = require('../../core/part31LaunchGovernanceConstants');
const goLiveApproval = require('../commerce/goLiveApproval');
const { getEffectiveFlags } = require('../commerce/commerceFeatureFlags');
const { createConnectorFromEnv } = require('../supplier/realSupplierConnector');
const { evaluateFinalOperationalReadiness } = require('./finalOperationalReadiness');

function safeBoolean(value) {
  return value === true;
}

function normalizeGate(name, result) {
  if (!result || typeof result !== 'object') {
    return blocked(`${name}:missing-result`);
  }
  if (
    result.status !== PART31_STATUS.READY &&
    result.status !== PART31_STATUS.CONDITION &&
    result.status !== PART31_STATUS.BLOCKED
  ) {
    return blocked(`${name}:invalid-status`);
  }
  return {
    status: result.status,
    reason: result.reason || null,
    ...result,
  };
}

function evaluateHumanApproval(input = {}) {
  if (!safeBoolean(input.humanLaunchApproval)) {
    return blocked('human-launch-approval-required');
  }
  return {
    status: PART31_STATUS.READY,
    reason: 'human-launch-approval-present',
  };
}

function evaluateEnvironmentSafety(input = {}) {
  const safety = input.safety || {};
  if (safety.salesEnabled === true) {
    return blocked('sales-must-remain-disabled');
  }
  if (safety.supplierLive === true) {
    return blocked('supplier-live-must-remain-disabled');
  }
  if (safety.liveImport === true) {
    return blocked('live-import-must-remain-disabled');
  }
  if (safety.publishEnabled === true) {
    return blocked('publish-must-remain-disabled');
  }
  if (safety.autoActivate === true) {
    return blocked('auto-activation-must-remain-disabled');
  }
  const flags = getEffectiveFlags();
  const connector = createConnectorFromEnv().getStatus();
  const envOk =
    !flags.salesEnabled &&
    !connector.liveImportEnabled &&
    !connector.credentialsConfigured &&
    goLiveApproval.PRODUCTION_SAFETY_LOCK;
  return envOk
    ? { status: PART31_STATUS.READY, reason: 'environment-safety-invariants-satisfied' }
    : blocked('environment-safety-invariants-violated');
}

function mapPart30OperationalGate(input = {}) {
  const part30 = evaluateFinalOperationalReadiness(input.part30 || input);
  const status =
    part30.status === 'READY'
      ? PART31_STATUS.CONDITION
      : part30.status === 'CONDITION'
        ? PART31_STATUS.CONDITION
        : PART31_STATUS.BLOCKED;
  return {
    status,
    reason: `part30-upstream-${part30.status.toLowerCase()}`,
    source: 'Part 30',
    diagnosticOnly: true,
  };
}

function aggregate(gates) {
  const statuses = Object.values(gates).map((gate) => gate.status);
  if (statuses.includes(PART31_STATUS.BLOCKED)) {
    return PART31_STATUS.BLOCKED;
  }
  if (statuses.includes(PART31_STATUS.CONDITION)) {
    return PART31_STATUS.CONDITION;
  }
  return PART31_STATUS.READY;
}

function evaluateFinalLaunchGovernance(input = {}) {
  const upstream = input.gates || {};
  const gates = {};

  for (const name of PART31_GATES) {
    if (name === 'humanLaunchApproval') {
      gates[name] = evaluateHumanApproval(input);
      continue;
    }
    if (name === 'environmentSafety') {
      gates[name] = evaluateEnvironmentSafety(input);
      continue;
    }
    if (name === 'finalOperationalReadiness') {
      gates[name] = input.gates?.finalOperationalReadiness
        ? normalizeGate(name, upstream.finalOperationalReadiness)
        : mapPart30OperationalGate(input);
      continue;
    }
    gates[name] = normalizeGate(name, upstream[name]);
  }

  /*
   * Part 31 is intentionally fail-closed.
   * Human launch approval is never granted automatically.
   */
  gates.humanLaunchApproval = blocked('human-launch-approval-required');

  const status = aggregate(gates);
  const blockedGates = PART31_GATES.filter(
    (name) => gates[name].status === PART31_STATUS.BLOCKED
  );
  const conditionGates = PART31_GATES.filter(
    (name) => gates[name].status === PART31_STATUS.CONDITION
  );
  const flags = getEffectiveFlags();
  const connector = createConnectorFromEnv().getStatus();

  return Object.freeze({
    part: 31,
    version: PART31_VERSION,
    ready: false,
    status,
    diagnosticOnly: PART31_POLICY.diagnosticOnly,
    autoActivate: PART31_POLICY.autoActivate,
    activationAllowed: false,
    supplierLive: false,
    salesEnabled: false,
    humanApprovalRequired: true,
    blockedGates,
    conditionGates,
    gates,
    safety: Object.freeze({
      salesEnabled: false,
      supplierLive: false,
      liveImport: false,
      publishEnabled: false,
      autoActivate: false,
      activationAllowed: false,
      productionSafetyLock: goLiveApproval.PRODUCTION_SAFETY_LOCK,
      supplierOrdersBlocked: !flags.supplierOrdersEnabled,
      stripeEnabled: flags.stripeEnabled,
      paypalEnabled: flags.paypalEnabled,
      credentialsConfigured: connector.credentialsConfigured,
    }),
    policy: PART31_POLICY,
    secretsExposed: false,
    generatedAt: new Date().toISOString(),
  });
}

function validateFinalLaunchGovernance(input = {}) {
  const result = evaluateFinalLaunchGovernance(input);
  return Object.freeze({
    ...result,
    validationOnly: true,
    mutationPerformed: false,
    supplierCallPerformed: false,
    paymentCallPerformed: false,
    publishPerformed: false,
    salesActivationPerformed: false,
    goLiveLockRemoved: false,
  });
}

function getPublicFinalLaunchGovernanceSummary(input = {}) {
  const governance = evaluateFinalLaunchGovernance(input);
  return Object.freeze({
    status: governance.status,
    ready: false,
    diagnosticOnly: true,
    autoActivate: false,
    activationAllowed: false,
    supplierLive: false,
    salesEnabled: false,
    humanApprovalRequired: true,
    blockers: governance.blockedGates.map((name) => ({
      name,
      status: governance.gates[name].status,
      reason: governance.gates[name].reason,
    })),
  });
}

module.exports = {
  evaluateFinalLaunchGovernance,
  validateFinalLaunchGovernance,
  getPublicFinalLaunchGovernanceSummary,
};
