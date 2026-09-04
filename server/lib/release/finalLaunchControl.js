'use strict';

/**
 * Part 34 — Final Launch Control
 *
 * Diagnostic-only. Fail-closed. Consumes Parts 28–33 readiness systems.
 */
const {
  PART34_VERSION,
  PART34_STATUS,
  PART34_GATES,
  PART34_POLICY,
  blocked,
  ready,
} = require('../../core/part34FinalLaunchControlConstants');
const goLiveApproval = require('../commerce/goLiveApproval');
const { getEffectiveFlags } = require('../commerce/commerceFeatureFlags');
const { createConnectorFromEnv } = require('../supplier/realSupplierConnector');
const { getFinalGoLiveReadiness } = require('./finalGoLiveReadiness');
const { evaluateFinalOperationalReadiness } = require('./finalOperationalReadiness');
const { evaluateFinalLaunchGovernance } = require('./finalLaunchGovernance');
const { evaluateFinalControlRecoveryReadiness } = require('./finalControlRecoveryReadiness');
const { evaluateFinalPreLaunchControl } = require('./finalPreLaunchControl');
const { PART32_GATES } = require('../../core/part32FinalControlRecoveryConstants');
const { PART33_GATES } = require('../../core/part33FinalPreLaunchControlConstants');

function gate(name, ok, details = {}) {
  return {
    name,
    status: ok ? PART34_STATUS.READY : PART34_STATUS.BLOCKED,
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
  if (upstream.ready === true || upstream.status === PART34_STATUS.READY || upstream.ok === true) {
    return gate(name, true, { source: upstream.source, reason: upstream.reason });
  }
  if (upstream.status === PART34_STATUS.CONDITION) {
    return {
      name,
      status: PART34_STATUS.CONDITION,
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

function deriveFromParts28To33(name) {
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

  return gate(name, false, { reason: `${name}:no-upstream-mapping`, source: 'Parts 28-33' });
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

function buildPart34Gates(input = {}) {
  const upstream = input.gates || {};
  const gates = [];

  for (const name of PART34_GATES) {
    if (name === 'humanFinalLaunchApproval') {
      gates.push(
        gate(name, false, {
          required: true,
          reason: 'HUMAN_FINAL_LAUNCH_APPROVAL_REQUIRED',
        })
      );
      continue;
    }
    if (name === 'environmentSafety') {
      const env = evaluateEnvironmentSafety(input);
      gates.push(
        gate(name, env.status === PART34_STATUS.READY, {
          reason: env.reason,
          source: 'Part 34',
        })
      );
      continue;
    }
    if (upstream[name]) {
      gates.push(normalizeUpstreamGate(name, upstream[name]));
      continue;
    }
    gates.push(deriveFromParts28To33(name));
  }

  return gates;
}

function evaluateFinalLaunchControl(input = {}) {
  const gates = buildPart34Gates(input);
  const blockers = gates.filter((item) => !item.ok || item.status === PART34_STATUS.BLOCKED);
  const flags = getEffectiveFlags();
  const connector = createConnectorFromEnv().getStatus();

  const p28 = getFinalGoLiveReadiness();
  const p31 = evaluateFinalLaunchGovernance();
  const p32 = evaluateFinalControlRecoveryReadiness({ gates: buildAllReadyPart32Gates() });
  const p33 = evaluateFinalPreLaunchControl({ gates: buildAllReadyPart33Gates() });

  return Object.freeze({
    part: 34,
    version: PART34_VERSION,
    ready: false,
    status: PART34_STATUS.BLOCKED,
    diagnosticOnly: PART34_POLICY.diagnosticOnly,
    autoActivate: PART34_POLICY.autoActivate,
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
    policy: PART34_POLICY,
    secretsExposed: false,
    generatedAt: new Date().toISOString(),
  });
}

function validateFinalLaunchControl(input = {}) {
  const result = evaluateFinalLaunchControl(input);
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

function getPublicFinalLaunchControlSummary(input = {}) {
  const control = evaluateFinalLaunchControl(input);
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
  evaluateFinalLaunchControl,
  validateFinalLaunchControl,
  buildPart34Gates,
  getPublicFinalLaunchControlSummary,
};
