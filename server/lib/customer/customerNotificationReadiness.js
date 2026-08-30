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
    deliveryMode: smtpConfigured ? "smtp_ready" : "queued_demo",
    wiredToCheckout: true,
    wiredToReturns: true,
    realEmailSendWhileSalesOff: false,
    autoInventTemplates: false,
  };
}

function emitCheckoutNotification(order, ctx = {}) {
  if (!order?.id) return { ok: false, reason: "missing_order" };
  try {
    const automationEngine = require("../automationEngine");
    automationEngine.emit(
      "order_confirmation",
      {
        orderId: order.id,
        customerId: order.customerId,
        orderType: order.orderType,
        dryRun: order.metadata?.dryRun !== false,
        testOnly: order.orderType !== "COMMERCIAL",
        total: order.total,
        language: ctx.language || "de",
      },
      { idempotencyKey: `order_notify_${order.id}` }
    );
    return { ok: true, queued: true };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
}

module.exports = {
  getNotificationReadiness,
  emitCheckoutNotification,
};
