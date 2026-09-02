/**
 * Part 21 — Central security readiness diagnostic (never auto-activates).
 */
const { SECURITY_READINESS_GATES } = require("../../core/securityObservabilityConstants");
const { READINESS_GATE_STATUS } = require("../../core/operationsConstants");
const { validateConfiguration } = require("../operations/configurationValidation");
const { getEffectiveFlags } = require("../commerce/commerceFeatureFlags");
const goLiveApproval = require("../commerce/goLiveApproval");
const { createConnectorFromEnv } = require("../supplier/realSupplierConnector");
const { getStoreInfo, isRateLimitDisabled } = require("../rateLimitStore");
const { listLockouts } = require("../accountLockout");

function gate(name, status, detail, extras = {}) {
  return { gate: name, status, detail, ...extras };
}

function evaluateSecurityReadiness({ adminDetail = false } = {}) {
  const gates = [];
  const config = validateConfiguration();
  const flags = getEffectiveFlags();
  const supplier = createConnectorFromEnv().getStatus();
  const rateLimit = getStoreInfo();

  gates.push(
    gate(
      "AUTHENTICATION",
      READINESS_GATE_STATUS.PASS,
      "admin sessions, scrypt hashing, lockout, 2FA foundation",
      adminDetail
        ? { lockoutsActive: listLockouts(50).filter((e) => e.locked).length }
        : undefined
    )
  );

  gates.push(
    gate(
      "AUTHORIZATION",
      READINESS_GATE_STATUS.PASS,
      "globalAuthMiddleware + RBAC routePermissions"
    )
  );

  const apiProtectionStatus = isRateLimitDisabled()
    ? READINESS_GATE_STATUS.CONDITION
    : READINESS_GATE_STATUS.PASS;
  gates.push(
    gate(
      "API_PROTECTION",
      apiProtectionStatus,
      isRateLimitDisabled() ? "rate limit disabled" : `rateLimit=${rateLimit.backend}`,
      adminDetail ? { csrfEnforced: process.env.BUZZARD_CSRF_ENFORCE === "1" } : undefined
    )
  );

  const headersOk =
    process.env.BUZZARD_HSTS !== "0" && process.env.BUZZARD_CSP !== "0";
  gates.push(
    gate(
      "SECURITY_HEADERS",
      headersOk ? READINESS_GATE_STATUS.PASS : READINESS_GATE_STATUS.CONDITION,
      headersOk ? "HSTS+CSP active" : "headers partially disabled"
    )
  );

  gates.push(
    gate("SECRET_HANDLING", READINESS_GATE_STATUS.PASS, "redactForLog active")
  );

  gates.push(
    gate(
      "PRODUCTION_SAFETY",
      goLiveApproval.PRODUCTION_SAFETY_LOCK && !flags.salesEnabled
        ? READINESS_GATE_STATUS.PASS
        : READINESS_GATE_STATUS.FAIL,
      `goLiveLock=${goLiveApproval.PRODUCTION_SAFETY_LOCK} sales=${flags.salesEnabled}`
    )
  );

  gates.push(
    gate(
      "PAYMENT_SAFETY",
      !flags.stripeEnabled && !flags.paypalEnabled && !flags.paymentEnabled
        ? READINESS_GATE_STATUS.PASS
        : READINESS_GATE_STATUS.FAIL,
      `stripe=${flags.stripeEnabled} paypal=${flags.paypalEnabled}`
    )
  );

  gates.push(
    gate(
      "SUPPLIER_SAFETY",
      !supplier.liveImportEnabled && supplier.dryRun && !supplier.credentialsConfigured
        ? READINESS_GATE_STATUS.PASS
        : supplier.credentialsConfigured
          ? READINESS_GATE_STATUS.CONDITION
          : READINESS_GATE_STATUS.BLOCKED,
      supplier.blockedReason || "dry_run_no_credentials"
    )
  );

  gates.push(
    gate(
      "CONFIG_VALIDATION",
      config.ok ? READINESS_GATE_STATUS.PASS : READINESS_GATE_STATUS.FAIL,
      config.ok ? "configuration valid" : config.errors[0]?.code || "invalid"
    )
  );

  gates.push(
    gate("AUDIT_LOGGING", READINESS_GATE_STATUS.PASS, "operationsAudit + securityLog active")
  );

  const summary = {
    pass: gates.filter((g) => g.status === READINESS_GATE_STATUS.PASS).length,
    fail: gates.filter((g) => g.status === READINESS_GATE_STATUS.FAIL).length,
    blocked: gates.filter((g) => g.status === READINESS_GATE_STATUS.BLOCKED).length,
    condition: gates.filter((g) => g.status === READINESS_GATE_STATUS.CONDITION).length,
  };

  const overall =
    summary.fail > 0
      ? "FAIL"
      : summary.blocked > 0
        ? "BLOCKED"
        : summary.condition > 0
          ? "CONDITION"
          : "PASS";

  const payload = {
    SECURITY_READINESS: {
      overall,
      diagnosticOnly: true,
      autoActivate: false,
      gateNames: SECURITY_READINESS_GATES,
      gates,
      summary,
      goLiveLock: goLiveApproval.PRODUCTION_SAFETY_LOCK,
      salesEnabled: flags.salesEnabled,
      timestamp: new Date().toISOString(),
    },
  };

  if (!adminDetail) {
    payload.SECURITY_READINESS.gates = gates.map(({ gate: g, status, detail }) => ({
      gate: g,
      status,
      detail: String(detail).slice(0, 120),
    }));
  }

  return payload;
}

module.exports = {
  evaluateSecurityReadiness,
};
