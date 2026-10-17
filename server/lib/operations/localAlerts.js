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

const ALERT_AI_ACTORS = new Set(["pusat", "guardian", "orchestrator", "esat", "agent", "ai"]);

function dispatch(input = {}, env = process.env) {
  const actor = String(input.actorId || input.actor || input.approver || "").trim().toLowerCase();
  const smtpPresent = Boolean(env.SMTP_HOST || env.SMTP_URL);
  const webhookPresent = Boolean(env.ALERT_WEBHOOK_URL || env.SLACK_WEBHOOK_URL);
  if (ALERT_AI_ACTORS.has(actor)) {
    return {
      ok: false,
      liveDispatch: false,
      smtpSent: false,
      webhookSent: false,
      pager: false,
      httpAttempted: false,
      secretsIncluded: false,
      webhookUrlIncluded: false,
      reason: "SELF_APPROVE_DENIED",
      actor,
    };
  }
  return {
    ok: false,
    liveDispatch: false,
    smtpSent: false,
    webhookSent: false,
    pager: false,
    httpAttempted: false,
    secretsIncluded: false,
    webhookUrlIncluded: false,
    forceDispatchIgnored: input.forceDispatch === true,
    smtpConfiguredIgnored: smtpPresent,
    webhookConfiguredIgnored: webhookPresent,
    reason: "ALERT_DISPATCH_BLOCKED",
    note: "Local generation is not live delivery. Item 185.",
  };
}

function confirmDelivery() {
  return {
    ok: false,
    liveDispatch: false,
    smtpSent: false,
    webhookSent: false,
    pager: false,
    delivered: false,
    httpAttempted: false,
    reason: "ALERT_DELIVERY_CONFIRM_BLOCKED",
    note: "Pager/SMTP/webhook receipts are not treated as dispatched alerts.",
  };
}

module.exports = {
  generateLocalAlerts,
  collectLocalAlerts,
  dispatch,
  confirmDelivery,
  buildAlertRules,
};
