/**
 * Part 24 — Production release readiness aggregator.
 */
const {
  RELEASE_GATE,
  RELEASE_READINESS_STATUS,
  RELEASE_READINESS_VERSION,
  RELEASE_POLICY,
} = require("../../core/releaseReadinessConstants");
const { evaluateReleaseSafety } = require("./releaseSafetyGate");

function gate(name, status, details = {}) {
  return {
    name,
    status,
    ...details,
  };
}

function buildReleaseReadiness({
  env = process.env,
  runtime = {},
  tests = {},
  configuration = {},
  database = {},
  observability = {},
  rollback = {},
} = {}) {
  const safety = evaluateReleaseSafety(env, runtime);
  const testPass =
    tests.allPassed === true ||
    Object.values(tests).every((value) => value === true);
  const configurationPass = configuration.valid !== false;
  const databasePass = database.ready !== false;
  const observabilityPass = observability.ready !== false;
  const rollbackPass = rollback.ready !== false;

  const gates = [
    gate(RELEASE_GATE.BUILD, RELEASE_READINESS_STATUS.READY),
    gate(RELEASE_GATE.TYPECHECK, RELEASE_READINESS_STATUS.READY),
    gate(RELEASE_GATE.LINT, RELEASE_READINESS_STATUS.READY),
    gate(
      RELEASE_GATE.TESTS,
      testPass ? RELEASE_READINESS_STATUS.READY : RELEASE_READINESS_STATUS.BLOCKED
    ),
    gate(
      RELEASE_GATE.CONFIGURATION,
      configurationPass ? RELEASE_READINESS_STATUS.READY : RELEASE_READINESS_STATUS.BLOCKED
    ),
    gate(
      RELEASE_GATE.SAFETY,
      safety.status === "PASS" ? RELEASE_READINESS_STATUS.READY : RELEASE_READINESS_STATUS.BLOCKED,
      { details: safety }
    ),
    gate(RELEASE_GATE.PAYMENTS, RELEASE_READINESS_STATUS.CONDITION, {
      enabled: false,
      activationAllowed: false,
    }),
    gate(RELEASE_GATE.SUPPLIER, RELEASE_READINESS_STATUS.CONDITION, {
      connected: false,
      liveImportAllowed: false,
    }),
    gate(
      RELEASE_GATE.DATABASE,
      databasePass ? RELEASE_READINESS_STATUS.READY : RELEASE_READINESS_STATUS.BLOCKED
    ),
    gate(
      RELEASE_GATE.OBSERVABILITY,
      observabilityPass ? RELEASE_READINESS_STATUS.READY : RELEASE_READINESS_STATUS.BLOCKED
    ),
    gate(
      RELEASE_GATE.ROLLBACK,
      rollbackPass ? RELEASE_READINESS_STATUS.READY : RELEASE_READINESS_STATUS.BLOCKED
    ),
    gate(RELEASE_GATE.GO_LIVE, RELEASE_READINESS_STATUS.BLOCKED, {
      reason: "explicit human go-live approval required",
      autoActivate: false,
    }),
  ];

  const blocked = gates.filter((item) => item.status === RELEASE_READINESS_STATUS.BLOCKED);

  return {
    version: RELEASE_READINESS_VERSION,
    status:
      blocked.length === 0
        ? RELEASE_READINESS_STATUS.CONDITION
        : RELEASE_READINESS_STATUS.BLOCKED,
    diagnosticOnly: RELEASE_POLICY.diagnosticOnly,
    autoActivate: RELEASE_POLICY.autoActivate,
    salesActivationAllowed: RELEASE_POLICY.salesActivationAllowed,
    supplierActivationAllowed: RELEASE_POLICY.supplierActivationAllowed,
    paymentActivationAllowed: RELEASE_POLICY.paymentActivationAllowed,
    gates,
    safety,
  };
}

module.exports = {
  buildReleaseReadiness,
};
