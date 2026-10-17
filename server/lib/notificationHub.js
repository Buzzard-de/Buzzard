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
      sent: false,
      live: false,
      note: "Internal store only. Not SMTP, SMS, or push.",
    };
  }
  return {
    status: "BLOCKED",
    deliveryResult: `${channel}_not_configured`,
    channel,
    sent: false,
    live: false,
    delivered: false,
  };
}

function confirmDelivery() {
  return {
    ok: false,
    status: "BLOCKED",
    sent: false,
    delivered: false,
    live: false,
    reason: "DELIVERY_CONFIRM_BLOCKED",
  };
}

module.exports = { NOTIFICATION_CHANNELS, deliverNotification, confirmDelivery };
