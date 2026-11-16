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
    deliveryMode: "dry_run_only",
    wiredToCheckout: true,
    wiredToReturns: true,
    realEmailSendWhileSalesOff: false,
    providerCalls: false,
    autoInventTemplates: false,
  };
}

function emitCheckoutNotification(order, ctx = {}) {
  if (!order?.id) return { ok: false, reason: "missing_order", sent: false, providerCalled: false, dryRun: true };
  try {
    const automationEngine = require("../automationEngine");
    const result = automationEngine.emit(
      "new_order",
      {
        orderNumber: order.orderNumber || order.id,
        customerId: order.customerId,
        language: ctx.language || "de",
      },
      {
        idempotencyKey: `order_notify_${order.id}`,
        isolate: ctx.isolate === true,
        transaction: ctx.transaction,
      }
    );
    return { ...result, queued: false, sent: false, providerCalled: false, dryRun: true };
  } catch (err) {
    return { ok: false, reason: err.message, sent: false, providerCalled: false, dryRun: true };
  }
}

module.exports = {
  getNotificationReadiness,
  emitCheckoutNotification,
};
