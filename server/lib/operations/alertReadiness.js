/**
 * Part 21 — Alerting readiness (internal always; external channels diagnostic only).
 */
const {
  ALERT_CHANNEL,
  ALERT_CHANNEL_STATUS,
} = require("../../core/securityObservabilityConstants");
const { listSecurityEvents } = require("../securityLog");
const monitoringReadiness = require("./monitoringReadiness");
const operationsControl = require("./operationsControl");

function channelStatus(configured, partial = false) {
  if (configured) return ALERT_CHANNEL_STATUS.CONFIGURED;
  if (partial) return ALERT_CHANNEL_STATUS.CONDITION;
  return ALERT_CHANNEL_STATUS.NOT_CONFIGURED;
}

function buildAlertRules(events, operations, monitoring) {
  const rules = [];
  const failedJobs = (operations.jobs?.FAILED || 0) + (operations.jobs?.PERMANENTLY_FAILED || 0);
  if (failedJobs > 0) {
    rules.push({
      rule: "repeated_job_failures",
      level: failedJobs > 3 ? "CRITICAL" : "WARNING",
      message: `${failedJobs} failed job(s)`,
      retryable: true,
    });
  }

  if (monitoring.components?.workers?.healthy === false) {
    rules.push({
      rule: "worker_failure",
      level: "CRITICAL",
      message: "Worker health check failed",
      retryable: true,
    });
  }

  if (monitoring.components?.db?.status === "FAILED") {
    rules.push({
      rule: "database_failure",
      level: "CRITICAL",
      message: "Database integrity check failed",
      retryable: false,
    });
  }

  if (!monitoring.components?.backup?.status || monitoring.components?.backup?.status === "MISSING") {
    rules.push({
      rule: "backup_failure",
      level: "WARNING",
      message: monitoring.components?.backup?.status || "backup issue",
      retryable: true,
    });
  }

  const securityCritical = events.filter(
    (e) => e.success === false && ["CRITICAL", "HIGH"].includes(String(e.severity || "").toUpperCase())
  );
  if (securityCritical.length > 0) {
    rules.push({
      rule: "security_failure",
      level: "WARNING",
      message: `${securityCritical.length} critical/high security event(s) in window`,
      retryable: false,
    });
  }

  const blockedAdmin = events.filter((e) =>
    ["go_live_blocked", "privilege_escalation_attempt", "commerce_permission_denied"].includes(e.type)
  );
  if (blockedAdmin.length >= 3) {
    rules.push({
      rule: "repeated_blocked_critical_actions",
      level: "WARNING",
      message: `${blockedAdmin.length} blocked critical admin action(s)`,
      retryable: false,
    });
  }

  const configAlerts = (monitoring.alerts || []).filter((a) => a.component === "CONFIG");
  if (configAlerts.length > 0) {
    rules.push({
      rule: "unexpected_configuration",
      level: "CRITICAL",
      message: configAlerts[0].reason,
      retryable: false,
    });
  }

  const unauthorized = events.filter((e) =>
    ["permission_denied", "idor_attempt", "csrf_failure"].includes(e.type)
  );
  if (unauthorized.length >= 5) {
    rules.push({
      rule: "unauthorized_admin_attempts",
      level: "WARNING",
      message: `${unauthorized.length} unauthorized access attempt(s)`,
      retryable: false,
    });
  }

  return rules;
}

async function getAlertReadiness() {
  const monitoring = await monitoringReadiness.getMonitoringSnapshot();
  const operations = operationsControl.getOperationsSummary();
  const events = listSecurityEvents(200);

  const smtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);
  const webhookConfigured = Boolean(
    process.env.BUZZARD_ALERT_WEBHOOK_URL || process.env.COMMERCE_WEBHOOK_SECRET
  );

  const channels = {
    [ALERT_CHANNEL.INTERNAL]: {
      status: ALERT_CHANNEL_STATUS.CONFIGURED,
      detail: "securityLog + monitoringReadiness + operationsAudit",
    },
    [ALERT_CHANNEL.SMTP]: {
      status: channelStatus(smtpConfigured),
      detail: smtpConfigured ? "SMTP configured" : "NOT_CONFIGURED",
    },
    [ALERT_CHANNEL.WEBHOOK]: {
      status: channelStatus(webhookConfigured),
      detail: webhookConfigured ? "webhook configured" : "NOT_CONFIGURED",
    },
  };

  const activeRules = buildAlertRules(events, operations, monitoring);
  const overall =
    activeRules.some((r) => r.level === "CRITICAL")
      ? "CRITICAL"
      : activeRules.length > 0
        ? "WARNING"
        : channels[ALERT_CHANNEL.SMTP].status === ALERT_CHANNEL_STATUS.NOT_CONFIGURED
          ? "CONDITION"
          : "OK";

  return {
    overall,
    diagnosticOnly: true,
    autoActivate: false,
    channels,
    activeRules,
    ruleCount: activeRules.length,
    auditable: true,
    secretsExposed: false,
    timestamp: new Date().toISOString(),
  };
}

module.exports = {
  getAlertReadiness,
  buildAlertRules,
};
