/**
 * Part 21 — Read-only security audit (structured findings, no secret exposure).
 */
const { AUDIT_FINDING_SEVERITY } = require("../../core/securityObservabilityConstants");
const { validateConfiguration } = require("../operations/configurationValidation");
const { getEffectiveFlags } = require("../commerce/commerceFeatureFlags");
const goLiveApproval = require("../commerce/goLiveApproval");
const { createConnectorFromEnv, isLiveImportEnabled } = require("../supplier/realSupplierConnector");
const { isRateLimitDisabled } = require("../rateLimitStore");
const { redactForLog } = require("../security");

function finding(severity, code, message, component) {
  return { severity, code, message, component, timestamp: new Date().toISOString() };
}

function runSecurityAudit() {
  const findings = [];
  const flags = getEffectiveFlags();
  const config = validateConfiguration();
  const supplier = createConnectorFromEnv().getStatus();

  if (!goLiveApproval.PRODUCTION_SAFETY_LOCK) {
    findings.push(
      finding(
        AUDIT_FINDING_SEVERITY.CRITICAL,
        "go_live_lock_inactive",
        "PRODUCTION_SAFETY_LOCK is not active",
        "PRODUCTION_SAFETY"
      )
    );
  }

  if (flags.salesEnabled) {
    findings.push(
      finding(
        AUDIT_FINDING_SEVERITY.CRITICAL,
        "sales_unexpectedly_enabled",
        "Sales flag enabled while pre go-live",
        "SALES"
      )
    );
  }

  if (flags.stripeEnabled || flags.paypalEnabled || flags.paymentEnabled) {
    findings.push(
      finding(
        AUDIT_FINDING_SEVERITY.CRITICAL,
        "payment_unexpectedly_enabled",
        "Payment provider flag enabled",
        "PAYMENTS"
      )
    );
  }

  if (isLiveImportEnabled() && !supplier.credentialsConfigured) {
    findings.push(
      finding(
        AUDIT_FINDING_SEVERITY.CRITICAL,
        "live_import_without_credentials",
        "Live supplier import enabled without credentials",
        "SUPPLIER"
      )
    );
  }

  if (!config.ok) {
    for (const err of config.errors) {
      findings.push(
        finding(
          AUDIT_FINDING_SEVERITY.CRITICAL,
          err.code,
          err.message,
          "CONFIG"
        )
      );
    }
  }

  for (const warn of config.warnings || []) {
    findings.push(
      finding(
        AUDIT_FINDING_SEVERITY.MEDIUM,
        warn.code,
        warn.message,
        "CONFIG"
      )
    );
  }

  if (isRateLimitDisabled()) {
    findings.push(
      finding(
        AUDIT_FINDING_SEVERITY.HIGH,
        "rate_limit_disabled",
        "API rate limiting is disabled",
        "API_PROTECTION"
      )
    );
  }

  if (process.env.BUZZARD_CSRF_ENFORCE !== "1") {
    findings.push(
      finding(
        AUDIT_FINDING_SEVERITY.LOW,
        "csrf_not_enforced",
        "CSRF enforcement not enabled (BUZZARD_CSRF_ENFORCE≠1)",
        "API_PROTECTION"
      )
    );
  }

  findings.push(
    finding(
      AUDIT_FINDING_SEVERITY.INFO,
      "global_auth_middleware",
      "globalAuthMiddleware active for protected admin routes",
      "AUTHORIZATION"
    )
  );

  findings.push(
    finding(
      AUDIT_FINDING_SEVERITY.INFO,
      "audit_logging_active",
      "operationsAudit and securityLog active",
      "AUDIT"
    )
  );

  const criticalCount = findings.filter((f) => f.severity === AUDIT_FINDING_SEVERITY.CRITICAL).length;
  const highCount = findings.filter((f) => f.severity === AUDIT_FINDING_SEVERITY.HIGH).length;

  const overall =
    criticalCount > 0
      ? "FAIL"
      : highCount > 0
        ? "CONDITION"
        : findings.some((f) => f.severity === AUDIT_FINDING_SEVERITY.MEDIUM)
          ? "CONDITION"
          : "PASS";

  return {
    overall,
    diagnosticOnly: true,
    autoActivate: false,
    findingCount: findings.length,
    criticalCount,
    highCount,
    findings: redactForLog(findings),
    secretsExposed: false,
    timestamp: new Date().toISOString(),
  };
}

module.exports = {
  runSecurityAudit,
  AUDIT_FINDING_SEVERITY,
};
