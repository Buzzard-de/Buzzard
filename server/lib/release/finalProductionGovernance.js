'use strict';

/**
 * Part 35 — Final Production Governance
 *
 * Diagnostic-only. Fail-closed. Consumes Parts 28–34 readiness systems.
 */
const {
  PART35_VERSION,
  PART35_STATUS,
  PART35_GATES,
  PART35_POLICY,
  blocked,
  ready,
} = require('../../core/part35FinalProductionGovernanceConstants');
const goLiveApproval = require('../commerce/goLiveApproval');
const { getEffectiveFlags } = require('../commerce/commerceFeatureFlags');
const { createConnectorFromEnv } = require('../supplier/realSupplierConnector');
const { getFinalGoLiveReadiness } = require('./finalGoLiveReadiness');
const { evaluateFinalOperationalReadiness } = require('./finalOperationalReadiness');
const { evaluateFinalLaunchGovernance } = require('./finalLaunchGovernance');
const { evaluateFinalControlRecoveryReadiness } = require('./finalControlRecoveryReadiness');
const { evaluateFinalPreLaunchControl } = require('./finalPreLaunchControl');
const { evaluateFinalLaunchControl } = require('./finalLaunchControl');
const { PART32_GATES } = require('../../core/part32FinalControlRecoveryConstants');
const { PART33_GATES } = require('../../core/part33FinalPreLaunchControlConstants');
const { PART34_GATES } = require('../../core/part34FinalLaunchControlConstants');

function gate(name, ok, details = {}) {
  return {
    name,
    status: ok ? PART35_STATUS.READY : PART35_STATUS.BLOCKED,
    ok: Boolean(ok),
    diagnosticOnly: true,
    activationAllowed: false,
    ...details,
  };
}

function normalizeUpstreamGate(name, upstream) {
  if (!upstream || typeof upstream !== 'object') {
    return gate(name, false, { reason: `${name}:missing-upstream` });
  }
  if (upstream.ready === true || upstream.status === PART35_STATUS.READY || upstream.ok === true) {
    return gate(name, true, { source: upstream.source, reason: upstream.reason });
  }
  if (upstream.status === PART35_STATUS.CONDITION) {
    return {
      name,
      status: PART35_STATUS.CONDITION,
      ok: false,
      diagnosticOnly: true,
      activationAllowed: false,
      reason: upstream.reason,
      source: upstream.source,
    };
  }
  return gate(name, false, { reason: upstream.reason || `${name}:blocked`, source: upstream.source });
}

function buildAllReadyPart32Gates() {
  return Object.fromEntries(
    PART32_GATES.filter((name) => name !== 'humanFinalControlApproval').map((name) => [
      name,
      { ready: true },
    ])
  );
}

function buildAllReadyPart33Gates() {
  return Object.fromEntries(
    PART33_GATES.filter((name) => name !== 'humanFinalPreLaunchApproval').map((name) => [
      name,
      { ready: true, status: 'READY', ok: true },
    ])
  );
}

function buildAllReadyPart34Gates() {
  return Object.fromEntries(
    PART34_GATES.filter((name) => name !== 'humanFinalLaunchApproval').map((name) => [
      name,
      { ready: true, status: 'READY', ok: true },
    ])
  );
}

function deriveFromParts28To34(name) {
  const p28 = getFinalGoLiveReadiness();
  const p28ByName = {
    configuration: 'configuration',
    security: 'securityReadiness',
    monitoring: 'monitoring',
    supplierReadiness: 'supplierSafety',
    paymentReadiness: 'paymentSafety',
    commerceReadiness: 'commerceSafety',
    releaseReadiness: 'productionReleaseReadiness',
    rollbackReadiness: 'productionReleaseReadiness',
    environmentSafety: 'environmentSafety',
  };
  const p28GateName = p28ByName[name];
  if (p28GateName) {
    const item = p28.gates.find((g) => g.name === p28GateName);
    if (item) {
      return gate(name, item.ok, { source: 'Part 28' });
    }
  }

  if (name === 'operationalReadiness') {
    const p30 = evaluateFinalOperationalReadiness();
    const nonHumanBlocked = (p30.blockedGates || []).filter(
      (gateName) => gateName !== 'humanOperationalApproval'
    );
    return gate(name, nonHumanBlocked.length === 0, {
      source: 'Part 30',
      upstreamStatus: p30.status,
    });
  }

  if (name === 'launchGovernance') {
    const p31 = evaluateFinalLaunchGovernance();
    const nonHumanBlocked = (p31.blockedGates || []).filter(
      (gateName) => gateName !== 'humanLaunchApproval'
    );
    return gate(name, nonHumanBlocked.length === 0, {
      source: 'Part 31',
      upstreamStatus: p31.status,
    });
  }

  if (name === 'preLaunchControl') {
    const p33 = evaluateFinalPreLaunchControl({ gates: buildAllReadyPart33Gates() });
    const nonHumanBlocked = (p33.blockers || []).filter(
      (item) => item.name !== 'humanFinalPreLaunchApproval'
    );
    return gate(name, nonHumanBlocked.length === 0, {
      source: 'Part 33',
      upstreamStatus: p33.status,
    });
  }

  if (name === 'finalControlRecovery') {
    const p32 = evaluateFinalControlRecoveryReadiness({ gates: buildAllReadyPart32Gates() });
    const nonHumanBlocked = (p32.blockedGates || []).filter(
      (gateName) => gateName !== 'humanFinalControlApproval'
    );
    return gate(name, nonHumanBlocked.length === 0, {
      source: 'Part 32',
      upstreamStatus: p32.status,
    });
  }

  if (name === 'finalLaunchControl') {
    const p34 = evaluateFinalLaunchControl({ gates: buildAllReadyPart34Gates() });
    const nonHumanBlocked = (p34.blockers || []).filter(
      (item) => item.name !== 'humanFinalLaunchApproval'
    );
    return gate(name, nonHumanBlocked.length === 0, {
      source: 'Part 34',
      upstreamStatus: p34.status,
    });
  }

  const p33Default = evaluateFinalPreLaunchControl();
  const p33GateMap = {
    authentication: 'authentication',
    incidentResponse: 'incidentResponse',
  };
  const p33GateName = p33GateMap[name];
  if (p33GateName) {
    const item = p33Default.gates.find((g) => g.name === p33GateName);
    if (item) {
      return gate(name, item.ok, { source: 'Part 33' });
    }
  }

  const p32 = evaluateFinalControlRecoveryReadiness({ gates: buildAllReadyPart32Gates() });
  const p32Map = {
    incidentReadiness: 'incidentReadiness',
    backupReadiness: 'backupReadiness',
    databaseReadiness: 'databaseReadiness',
    workerReadiness: 'workerReadiness',
    productQualityReadiness: 'productQualityReadiness',
    authorization: 'authorization',
    alerting: 'alerting',
  };
  const p32Name = p32Map[name];
  if (p32Name) {
    const item = p32.gates.find((g) => g.name === p32Name);
    if (item) {
      return gate(name, item.ready === true, { source: 'Part 32' });
    }
  }

  return gate(name, false, { reason: `${name}:no-upstream-mapping`, source: 'Parts 28-34' });
}

function evaluateEnvironmentSafety(input = {}) {
  const safety = input.safety || {};
  if (safety.salesEnabled === true) return blocked('sales-must-remain-disabled');
  if (safety.supplierLive === true) return blocked('supplier-live-must-remain-disabled');
  if (safety.liveImport === true) return blocked('live-import-must-remain-disabled');
  if (safety.publishEnabled === true) return blocked('publish-must-remain-disabled');
  if (safety.autoActivate === true) return blocked('auto-activation-must-remain-disabled');

  const flags = getEffectiveFlags();
  const connector = createConnectorFromEnv().getStatus();
  const ok =
    !flags.salesEnabled &&
    !flags.paymentEnabled &&
    !flags.stripeEnabled &&
    !flags.paypalEnabled &&
    !connector.liveImportEnabled &&
    !connector.credentialsConfigured &&
    goLiveApproval.PRODUCTION_SAFETY_LOCK;

  return ok
    ? ready({ reason: 'environment-safety-invariants-satisfied' })
    : blocked('environment-safety-invariants-violated');
}

function buildPart35Gates(input = {}) {
  const upstream = input.gates || {};
  const gates = [];

  for (const name of PART35_GATES) {
    if (name === 'humanFinalProductionGovernanceApproval') {
      gates.push(
        gate(name, false, {
          required: true,
          reason: 'HUMAN_FINAL_PRODUCTION_GOVERNANCE_APPROVAL_REQUIRED',
        })
      );
      continue;
    }
    if (name === 'environmentSafety') {
      const env = evaluateEnvironmentSafety(input);
      gates.push(
        gate(name, env.status === PART35_STATUS.READY, {
          reason: env.reason,
          source: 'Part 35',
        })
      );
      continue;
    }
    if (upstream[name]) {
      gates.push(normalizeUpstreamGate(name, upstream[name]));
      continue;
    }
    gates.push(deriveFromParts28To34(name));
  }

  return gates;
}

function evaluateFinalProductionGovernance(input = {}) {
  const gates = buildPart35Gates(input);
  const blockers = gates.filter((item) => !item.ok || item.status === PART35_STATUS.BLOCKED);
  const flags = getEffectiveFlags();
  const connector = createConnectorFromEnv().getStatus();

  const p28 = getFinalGoLiveReadiness();
  const p31 = evaluateFinalLaunchGovernance();
  const p32 = evaluateFinalControlRecoveryReadiness({ gates: buildAllReadyPart32Gates() });
  const p33 = evaluateFinalPreLaunchControl({ gates: buildAllReadyPart33Gates() });
  const p34 = evaluateFinalLaunchControl({ gates: buildAllReadyPart34Gates() });

  return Object.freeze({
    part: 35,
    version: PART35_VERSION,
    ready: false,
    status: PART35_STATUS.BLOCKED,
    diagnosticOnly: PART35_POLICY.diagnosticOnly,
    autoActivate: PART35_POLICY.autoActivate,
    activationAllowed: false,
    supplierLive: connector.liveImportEnabled === true,
    salesEnabled: flags.salesEnabled,
    humanApprovalRequired: true,
    gates,
    blockers,
    upstream: {
      part28: { status: p28.status, blockerCount: p28.blockers.length },
      part31: { status: p31.status },
      part32: { status: p32.status, upstreamReady: p32.upstreamReady },
      part33: { status: p33.status },
      part34: { status: p34.status },
    },
    safety: Object.freeze({
      salesEnabled: false,
      supplierLive: false,
      liveImport: false,
      publishEnabled: false,
      autoActivate: false,
      activationAllowed: false,
      paymentActivationAllowed: false,
      stripeEnabled: flags.stripeEnabled,
      paypalEnabled: flags.paypalEnabled,
      supplierOrdersBlocked: !flags.supplierOrdersEnabled,
      productionSafetyLock: goLiveApproval.PRODUCTION_SAFETY_LOCK,
    }),
    policy: PART35_POLICY,
    secretsExposed: false,
    generatedAt: new Date().toISOString(),
  });
}

function validateFinalProductionGovernance(input = {}) {
  const result = evaluateFinalProductionGovernance(input);
  return Object.freeze({
    ...result,
    validationOnly: true,
    dryRun: true,
    mutationPerformed: false,
    supplierCallPerformed: false,
    paymentCallPerformed: false,
    publishPerformed: false,
    salesActivationPerformed: false,
    goLiveLockRemoved: false,
  });
}

function getPublicFinalProductionGovernanceSummary(input = {}) {
  const control = evaluateFinalProductionGovernance(input);
  return Object.freeze({
    status: control.status,
    ready: false,
    diagnosticOnly: true,
    autoActivate: false,
    activationAllowed: false,
    supplierLive: false,
    salesEnabled: false,
    humanApprovalRequired: true,
    gateCount: control.gates.length,
    blockers: control.blockers.map((item) => ({
      name: item.name,
      status: item.status,
      reason: item.reason,
    })),
  });
}

module.exports = {
  evaluateFinalProductionGovernance,
  validateFinalProductionGovernance,
  buildPart35Gates,
  getPublicFinalProductionGovernanceSummary,
};
