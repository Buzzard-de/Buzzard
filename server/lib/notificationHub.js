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

function deliverNotification(notification) {
  const channel = notification.channel || NOTIFICATION_CHANNELS.INTERNAL;
  if (channel === NOTIFICATION_CHANNELS.INTERNAL) {
    return {
      status: "DELIVERED",
      deliveryResult: "stored_internal",
      channel,
    };
  }
  return {
    status: "PENDING",
    deliveryResult: `${channel}_not_configured`,
    channel,
  };
}

module.exports = { NOTIFICATION_CHANNELS, deliverNotification };
