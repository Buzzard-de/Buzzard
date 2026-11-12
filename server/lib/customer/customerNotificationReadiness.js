/**
 * Part 19 — Customer notification architecture readiness.
 */
const fs = require("fs");
const path = require("path");

function getNotificationReadiness() {
  const enginePath = path.join(__dirname, "..", "notificationEngine.js");
  const hasEngine = fs.existsSync(enginePath);
  let templateEvents = 12;
  if (hasEngine) {
    try {
      require("../notificationEngine");
    } catch {
      templateEvents = 0;
    }
  }

  const smtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);
  return {
    notificationEngine: hasEngine,
    templateEvents,
    smtpConfigured,
    deliveryMode: "BLOCKED_EXTERNAL",
    wiredToCheckout: false,
    wiredToReturns: false,
    realEmailSendWhileSalesOff: false,
    autoInventTemplates: false,
  };
}

function emitCheckoutNotification(order, ctx = {}) {
  if (!order?.id) return { ok: false, reason: "missing_order", sent: false, queued: false };
  const automationEngine = require("../automationEngine");
  const result = automationEngine.emit(
    "new_order",
    { orderNumber: order.orderNumber || String(order.id), language: ctx.language || "de" },
    { idempotencyKey: `order_notify_${order.id}` }
  );
  return {
    ok: false,
    queued: false,
    sent: false,
    customerNotified: false,
    code: result.event?.notification?.code || "NOTIFICATION_NOT_LIVE",
    live: false,
  };
}

module.exports = {
  getNotificationReadiness,
  emitCheckoutNotification,
};
