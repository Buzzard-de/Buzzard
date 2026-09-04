'use strict';
const {
  PART30_STATUS,
  PART30_GATES,
  PART30_POLICY,
  blocked,
} = require('../../core/part30OperationalReadinessConstants');
function safeBoolean(value) {
  return value === true;
}
function normalizeGate(name, result) {
  if (!result || typeof result !== 'object') {
    return blocked(`${name}:missing-result`);
  }
  if (
    result.status !== PART30_STATUS.READY &&
    result.status !== PART30_STATUS.CONDITION &&
    result.status !== PART30_STATUS.BLOCKED
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
  if (!safeBoolean(input.humanOperationalApproval)) {
    return blocked('human-operational-approval-required');
  }
  return {
    status: PART30_STATUS.READY,
    reason: 'human-operational-approval-present',
  };
}
function evaluateSafety(input = {}) {
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
  return {
    status: PART30_STATUS.READY,
    reason: 'operational-safety-invariants-satisfied',
  };
}
function aggregate(gates) {
  const statuses = Object.values(gates).map((gate) => gate.status);
  if (statuses.includes(PART30_STATUS.BLOCKED)) {
    return PART30_STATUS.BLOCKED;
  }
  if (statuses.includes(PART30_STATUS.CONDITION)) {
    return PART30_STATUS.CONDITION;
  }
  return PART30_STATUS.READY;
}
function evaluateFinalOperationalReadiness(input = {}) {
  const upstream = input.gates || {};
  const gates = {};
  for (const name of PART30_GATES) {
    if (name === 'humanOperationalApproval') {
      gates[name] = evaluateHumanApproval(input);
      continue;
    }
    if (name === 'environmentSafety') {
      gates[name] = evaluateSafety(input);
      continue;
    }
    gates[name] = normalizeGate(name, upstream[name]);
  }
  /*
   * Part 30 is intentionally fail-closed.
   * Human operational approval is not granted automatically.
   */
  if (gates.humanOperationalApproval.status !== PART30_STATUS.READY) {
    gates.humanOperationalApproval = blocked(
      'human-operational-approval-required'
    );
  }
  const status = aggregate(gates);
  const blockedGates = PART30_GATES.filter(
    (name) => gates[name].status === PART30_STATUS.BLOCKED
  );
  const conditionGates = PART30_GATES.filter(
    (name) => gates[name].status === PART30_STATUS.CONDITION
  );
  return Object.freeze({
    ready: false,
    status: status === PART30_STATUS.READY
      ? PART30_STATUS.CONDITION
      : status,
    diagnosticOnly: PART30_POLICY.diagnosticOnly,
    autoActivate: PART30_POLICY.autoActivate,
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
    }),
    policy: PART30_POLICY,
    secretsExposed: false,
  });
}
module.exports = {
  evaluateFinalOperationalReadiness,
};
