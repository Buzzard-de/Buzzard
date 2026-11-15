/**
 * Notification states stay separate from cargo delivery.
 * SENT and DELIVERY_CONFIRMED require a live provider receipt.
 * This process does not have that receipt, so those states are not returned.
 */

const NOTIFICATION_CHANNELS = Object.freeze({
  INTERNAL: "internal",
  IN_APP: "in_app",
  EMAIL: "email",
  SMS: "sms",
  PUSH: "push",
  WHATSAPP: "whatsapp",
  SLACK: "slack",
  TEAMS: "teams",
});

const NOTIFICATION_STATUSES = Object.freeze({
  QUEUED: "QUEUED",
  SENT: "SENT",
  DELIVERY_CONFIRMED: "DELIVERY_CONFIRMED",
  FAILED: "FAILED",
  BLOCKED_EXTERNAL: "BLOCKED_EXTERNAL",
  UNKNOWN: "UNKNOWN",
});

const EXTERNAL_CHANNELS = new Set([
  NOTIFICATION_CHANNELS.EMAIL,
  NOTIFICATION_CHANNELS.SMS,
  NOTIFICATION_CHANNELS.PUSH,
  NOTIFICATION_CHANNELS.WHATSAPP,
  NOTIFICATION_CHANNELS.SLACK,
  NOTIFICATION_CHANNELS.TEAMS,
]);

const CARRIER_TOPICS = new Set(["shipment", "tracking", "delivery"]);
const CUSTOMER_TOPICS = new Set(["order_status", "return", "refund"]);
const seenNotifications = new Map();

function requestKey(notification) {
  return notification.idempotencyKey || notification.eventId || notification.requestId || null;
}

function blocked(code, status, notification, channel, topic) {
  return {
    ok: false,
    status,
    code,
    channel,
    topic: topic || null,
    sent: false,
    queued: false,
    deliveryConfirmed: false,
    customerNotified: false,
    live: false,
    mock: notification.mock === true || notification.demo === true || notification.test === true,
    providerMessageId: null,
    providerAcknowledged: false,
    assumedSent: false,
    recipientEchoed: false,
    callerFlagIgnored: Boolean(
      notification.sent === true ||
      notification.delivered === true ||
      notification.acknowledged === true ||
      notification.live === true ||
      notification.verified === true ||
      notification.approved === true
    ),
  };
}

function auditAttempt(result, key) {
  try {
    const { logAudit } = require("./coreAudit");
    logAudit({
      action: "notification.deliver",
      entityType: "notification",
      entityId: key,
      result: "blocked",
      metadata: {
        code: result.code,
        status: result.status,
        channel: result.channel,
        topic: result.topic,
      },
    });
  } catch {
    /* audit must not turn a blocked notice into a send */
  }
}

function deliverNotification(notification = {}) {
  const key = requestKey(notification);
  if (key && seenNotifications.has(key)) {
    const duplicate = blocked("DUPLICATE_NOTIFICATION", NOTIFICATION_STATUSES.UNKNOWN, notification, notification.channel || null, null);
    duplicate.duplicate = true;
    duplicate.priorCode = seenNotifications.get(key);
    auditAttempt(duplicate, key);
    return duplicate;
  }

  const topic = String(notification.kind || notification.topic || notification.type || "");
  const channel = String(notification.channel || NOTIFICATION_CHANNELS.INTERNAL).toLowerCase();
  const mock = notification.mock === true || notification.demo === true || notification.test === true || notification.source === "mock";

  let result;
  if (notification.timeout === true || notification.forceTimeout === true) {
    result = blocked("TIMEOUT", NOTIFICATION_STATUSES.FAILED, notification, channel, topic);
  } else if (notification.networkError === true) {
    result = blocked("NETWORK_ERROR", NOTIFICATION_STATUSES.FAILED, notification, channel, topic);
  } else if (mock) {
    result = blocked("MOCK_NOT_SENT", NOTIFICATION_STATUSES.BLOCKED_EXTERNAL, notification, channel, topic);
  } else if (CARRIER_TOPICS.has(topic)) {
    result = blocked("CARRIER_NOT_LIVE", NOTIFICATION_STATUSES.BLOCKED_EXTERNAL, notification, channel, topic);
  } else if (CUSTOMER_TOPICS.has(topic)) {
    result = blocked("NOTIFICATION_NOT_LIVE", NOTIFICATION_STATUSES.BLOCKED_EXTERNAL, notification, channel, topic);
  } else if (EXTERNAL_CHANNELS.has(channel)) {
    result = blocked("PROVIDER_NOT_LIVE", NOTIFICATION_STATUSES.BLOCKED_EXTERNAL, notification, channel, topic);
  } else if (channel === NOTIFICATION_CHANNELS.INTERNAL || channel === NOTIFICATION_CHANNELS.IN_APP) {
    result = blocked("INTERNAL_NOT_DELIVERY", NOTIFICATION_STATUSES.UNKNOWN, notification, channel, topic);
  } else {
    result = blocked("UNKNOWN_CHANNEL", NOTIFICATION_STATUSES.UNKNOWN, notification, channel, topic);
  }

  if (result.status === NOTIFICATION_STATUSES.SENT || result.status === NOTIFICATION_STATUSES.DELIVERY_CONFIRMED || result.status === NOTIFICATION_STATUSES.QUEUED) {
    result.status = NOTIFICATION_STATUSES.BLOCKED_EXTERNAL;
    result.code = "PROVIDER_NOT_LIVE";
    result.sent = false;
    result.queued = false;
    result.deliveryConfirmed = false;
  }

  if (key) seenNotifications.set(key, result.code);
  auditAttempt(result, key);
  return result;
}

module.exports = {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_STATUSES,
  deliverNotification,
};
