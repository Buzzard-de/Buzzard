/**
 * Local alert generation. Never dispatches to SMTP, webhooks, or pagers.
 */

const { getAlertReadiness, buildAlertRules } = require("./alertReadiness");

function generateLocalAlerts(readiness) {
  const rules = Array.isArray(readiness?.activeRules) ? readiness.activeRules : [];
  return {
    diagnosticOnly: true,
    liveDispatch: false,
    pager: false,
    smtpSent: false,
    webhookSent: false,
    autoActivate: false,
    deliveryBlocked: "no_authorized_alerting_backend",
    alerts: rules.map((rule) => ({
      rule: rule.rule,
      level: rule.level,
      message: rule.message,
      retryable: rule.retryable,
      dispatched: false,
    })),
    alertCount: rules.length,
    overall: readiness?.overall || "UNKNOWN",
    secretsExposed: false,
    timestamp: new Date().toISOString(),
  };
}

async function collectLocalAlerts() {
  const readiness = await getAlertReadiness();
  return generateLocalAlerts(readiness);
}

module.exports = {
  generateLocalAlerts,
  collectLocalAlerts,
  buildAlertRules,
};
