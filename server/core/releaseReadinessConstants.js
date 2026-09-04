/**
 * Part 24 — Production release readiness constants.
 */
const RELEASE_READINESS_STATUS = Object.freeze({
  READY: "READY",
  CONDITION: "CONDITION",
  BLOCKED: "BLOCKED",
});

const RELEASE_GATE = Object.freeze({
  BUILD: "build",
  TYPECHECK: "typecheck",
  LINT: "lint",
  TESTS: "tests",
  CONFIGURATION: "configuration",
  SAFETY: "safety",
  PAYMENTS: "payments",
  SUPPLIER: "supplier",
  DATABASE: "database",
  OBSERVABILITY: "observability",
  ROLLBACK: "rollback",
  GO_LIVE: "goLive",
});

const RELEASE_READINESS_VERSION = "part24";

const RELEASE_POLICY = Object.freeze({
  diagnosticOnly: true,
  autoActivate: false,
  salesActivationAllowed: false,
  supplierActivationAllowed: false,
  paymentActivationAllowed: false,
});

module.exports = {
  RELEASE_READINESS_STATUS,
  RELEASE_GATE,
  RELEASE_READINESS_VERSION,
  RELEASE_POLICY,
};
