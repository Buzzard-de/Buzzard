/**
 * Notification channel abstraction — internal only for now.
 * Future: EMAIL, SMS, PUSH, WHATSAPP, SLACK, TEAMS.
 */

const NOTIFICATION_CHANNELS = Object.freeze({
  INTERNAL: "internal",
  EMAIL: "email",
  SMS: "sms",
  PUSH: "push",
  WHATSAPP: "whatsapp",
  SLACK: "slack",
  TEAMS: "teams",
});

function deliverNotification(notification = {}) {
  const { decideNotification, callProvider } = require("./notificationAdmission");
  const channel = String(notification.channel || NOTIFICATION_CHANNELS.INTERNAL).toLowerCase();
  const provider = callProvider();
  if (channel === NOTIFICATION_CHANNELS.WHATSAPP) {
    return {
      status: "REFUSED",
      deliveryResult: "WHATSAPP_CLOSED",
      code: "WHATSAPP_CLOSED",
      channel,
      sent: false,
      dryRun: true,
      providerCalled: false,
      provider,
    };
  }
  if (channel === NOTIFICATION_CHANNELS.INTERNAL) {
    return {
      status: "HELD",
      deliveryResult: "stored_internal",
      channel,
      sent: false,
      dryRun: true,
      providerCalled: false,
      provider,
    };
  }
  const decision = decideNotification({
    eventType: notification.eventType,
    channel,
    consent: notification.consent,
    transaction: notification.transaction,
    operational: notification.operational,
    approval: notification.approval,
    jobId: notification.jobId,
    aiInitiated: notification.aiInitiated,
  });
  return {
    status: "HELD",
    deliveryResult: decision.code,
    channel,
    ...decision,
    sent: false,
    providerCalled: false,
    provider,
  };
}

module.exports = { NOTIFICATION_CHANNELS, deliverNotification };
