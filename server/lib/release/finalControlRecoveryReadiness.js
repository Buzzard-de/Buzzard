'use strict';
const {
  PART32_GATES,
  PART32_POLICY,
  BLOCKED_STATUS,
} = require('../../core/part32FinalControlRecoveryConstants');
function safeGateResult(name, input) {
  const source = input && typeof input === 'object' ? input : {};
  return {
    name,
    ready: source.ready === true,
    status: source.ready === true ? 'READY' : BLOCKED_STATUS,
    diagnosticOnly: true,
    activationAllowed: false,
  };
}
function evaluateFinalControlRecoveryReadiness(context = {}) {
  const upstream = context.gates || {};
  const gates = PART32_GATES.map((name) => {
    if (name === 'humanFinalControlApproval') {
      return {
        name,
        ready: false,
        status: BLOCKED_STATUS,
        reason: 'HUMAN_FINAL_CONTROL_APPROVAL_REQUIRED',
        diagnosticOnly: true,
        activationAllowed: false,
      };
    }
    return safeGateResult(name, upstream[name]);
  });
  const upstreamReady = gates
    .filter((gate) => gate.name !== 'humanFinalControlApproval')
    .every((gate) => gate.ready === true);
  const decision = {
    ready: false,
    status: BLOCKED_STATUS,
    diagnosticOnly: true,
    autoActivate: false,
    activationAllowed: false,
    supplierLive: false,
    salesEnabled: false,
    paymentActivationAllowed: false,
    publishAllowed: false,
    humanApprovalRequired: true,
    upstreamReady,
    gates,
    policy: PART32_POLICY,
  };
  return Object.freeze(decision);
}
module.exports = {
  evaluateFinalControlRecoveryReadiness,
};
