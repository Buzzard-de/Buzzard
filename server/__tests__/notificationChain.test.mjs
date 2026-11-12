import { afterAll, describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const auditDir = fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-audit-"));
const previousAuditDir = process.env.BUZZARD_AUDIT_DIR;
process.env.BUZZARD_AUDIT_DIR = auditDir;

afterAll(() => {
  if (previousAuditDir == null) delete process.env.BUZZARD_AUDIT_DIR;
  else process.env.BUZZARD_AUDIT_DIR = previousAuditDir;
});

const { deliverNotification, NOTIFICATION_STATUSES } = require("../lib/notificationHub.js");
const notificationEngine = require("../lib/notificationEngine.js");
const automationEngine = require("../lib/automationEngine.js");
const readiness = require("../lib/customer/customerNotificationReadiness.js");
const { enqueueDeadLetter } = require("../lib/logistics/v5/resilience.js");
const customerSupport = require("../lib/customerSupport.js");
const automation = require("../lib/orderAutomation.js");
const marketing = require("../lib/marketingCenter.js");
const aiCenter = require("../lib/aiCenter.js");
const { db } = require("../lib/db");

describe("notification delivery stays unconfirmed", () => {
  it("does not treat an internal record or caller flags as a customer delivery", () => {
    const internal = deliverNotification({
      channel: "internal",
      kind: "general",
      sent: true,
      delivered: true,
      acknowledged: true,
      live: true,
      recipient: "buyer@example.com",
      idempotencyKey: "notice-internal",
    });
    expect(internal.status).toBe(NOTIFICATION_STATUSES.UNKNOWN);
    expect(internal.code).toBe("INTERNAL_NOT_DELIVERY");
    expect(internal.sent).toBe(false);
    expect(internal.queued).toBe(false);
    expect(internal.deliveryConfirmed).toBe(false);
    expect(internal.customerNotified).toBe(false);
    expect(internal.callerFlagIgnored).toBe(true);
    expect(JSON.stringify(internal)).not.toContain("DELIVERED");
    expect(JSON.stringify(internal)).not.toContain("buyer@example.com");
  });

  it("blocks email, sms, whatsapp, in-app, order, return, and tracking notices", () => {
    const cases = [
      [{ channel: "email", idempotencyKey: "email-1" }, "PROVIDER_NOT_LIVE"],
      [{ channel: "sms", idempotencyKey: "sms-1" }, "PROVIDER_NOT_LIVE"],
      [{ channel: "whatsapp", idempotencyKey: "wa-1" }, "PROVIDER_NOT_LIVE"],
      [{ channel: "in_app", idempotencyKey: "app-1" }, "INTERNAL_NOT_DELIVERY"],
      [{ channel: "email", kind: "order_status", idempotencyKey: "order-1" }, "NOTIFICATION_NOT_LIVE"],
      [{ channel: "email", kind: "return", idempotencyKey: "return-1" }, "NOTIFICATION_NOT_LIVE"],
      [{ channel: "email", kind: "delivery", idempotencyKey: "track-1" }, "CARRIER_NOT_LIVE"],
    ];
    for (const [input, code] of cases) {
      const result = deliverNotification(input);
      expect(result.code).toBe(code);
      expect(result.sent).toBe(false);
      expect(result.status).not.toBe(NOTIFICATION_STATUSES.SENT);
      expect(result.status).not.toBe(NOTIFICATION_STATUSES.DELIVERY_CONFIRMED);
      expect(result.status).not.toBe(NOTIFICATION_STATUSES.QUEUED);
    }
  });

  it("keeps mock, timeout, network, and duplicate attempts unsent", () => {
    const mock = deliverNotification({ channel: "email", mock: true, idempotencyKey: "mock-1", test: true });
    expect(mock.code).toBe("MOCK_NOT_SENT");
    expect(mock.sent).toBe(false);

    const timeout = deliverNotification({ channel: "sms", timeout: true, idempotencyKey: "timeout-1" });
    const network = deliverNotification({ channel: "whatsapp", networkError: true, idempotencyKey: "net-1" });
    expect(timeout.status).toBe("FAILED");
    expect(timeout.code).toBe("TIMEOUT");
    expect(timeout.assumedSent).toBe(false);
    expect(network.code).toBe("NETWORK_ERROR");
    expect(network.providerAcknowledged).toBe(false);

    const first = deliverNotification({ channel: "email", idempotencyKey: "dup-notice", acknowledged: true });
    const second = deliverNotification({ channel: "email", idempotencyKey: "dup-notice", acknowledged: true });
    expect(first.deliveryConfirmed).toBe(false);
    expect(second.code).toBe("DUPLICATE_NOTIFICATION");
    expect(second.duplicate).toBe(true);
    expect(second.sent).toBe(false);
  });

  it("does not queue a customer email, store a tracking event, or log the address", () => {
    const notes = db.prepare("SELECT COUNT(*) n FROM notifications").get().n;
    const tracks = db.prepare("SELECT COUNT(*) n FROM tracking_events").get().n;
    const email = customerSupport.queueEmailNotification({
      userId: 1,
      subject: "Order",
      body: "Your parcel was delivered to buyer@example.com",
      type: "shipment",
      idempotencyKey: "mail-queue-1",
      sent: true,
    });
    const whatsapp = customerSupport.queueWhatsAppNotification({
      userId: 1,
      body: "Hello",
      idempotencyKey: "wa-queue-1",
    });
    const tracking = customerSupport.createTrackingEvent({
      orderNumber: "BZ-NOTICE",
      status: "DELIVERED",
      trackingNumber: "AB123456",
    });
    expect(email.queued).toBe(false);
    expect(email.sent).toBe(false);
    expect(email.notificationStatus).toBe("BLOCKED_EXTERNAL");
    expect(whatsapp.code).toBe("PROVIDER_NOT_LIVE");
    expect(tracking.stored).toBe(false);
    expect(tracking.delivered).toBe(false);
    expect(db.prepare("SELECT COUNT(*) n FROM notifications").get().n).toBe(notes);
    expect(db.prepare("SELECT COUNT(*) n FROM tracking_events").get().n).toBe(tracks);

    const audit = fs.readFileSync(path.join(auditDir, "audit-log.json"), "utf8");
    expect(audit).toContain("\"result\": \"blocked\"");
    expect(audit).not.toContain("buyer@example.com");
    expect(audit).not.toContain("DELIVERED");
  });

  it("does not record a delivered order event, a recovered job, or a refund conversion", () => {
    const before = db.prepare("SELECT COUNT(*) n FROM integration_events").get().n;
    const refused = automation.recordEvent("shipment", "BZ-NOTICE", "dhl", "DELIVERED", {});
    const supplier = automation.recordSupplierResult({ orderNumber: "BZ-NOTICE", status: "confirmed" });
    expect(refused.stored).toBe(false);
    expect(refused.code).toBe("EVENT_UNVERIFIED");
    expect(supplier.confirmed).toBe(false);
    expect(supplier.submissionStatus).toBe("BLOCKED_EXTERNAL");
    expect(db.prepare("SELECT COUNT(*) n FROM integration_events").get().n).toBe(before);

    const kept = automation.recordEvent("shipment", "BZ-NOTICE", "dhl", "provider_error", {});
    expect(kept.stored).toBe(true);
    expect(kept.claimed).toBe(false);

    const job = db.prepare(
      "INSERT INTO automation_jobs (job_key, type, order_number, status, attempts) VALUES (?, ?, ?, ?, ?)"
    ).run(`job-${Date.now()}`, "shipment", "BZ-NOTICE", "failed", 2);
    const retried = automation.retryJob(job.lastInsertRowid);
    const row = db.prepare("SELECT status, attempts FROM automation_jobs WHERE id = ?").get(job.lastInsertRowid);
    expect(retried.recovered).toBe(false);
    expect(retried.requeued).toBe(false);
    expect(row.status).toBe("failed");
    expect(row.attempts).toBe(2);

    const ai = db.prepare("INSERT INTO aictr_jobs (job_type, status) VALUES (?, ?)").run("notice", "failed");
    const aiRetry = aiCenter.retryJob(ai.lastInsertRowid);
    const aiRow = db.prepare("SELECT status FROM aictr_jobs WHERE id = ?").get(ai.lastInsertRowid);
    expect(aiRetry.code).toBe("RETRY_NOT_CONFIRMED");
    expect(aiRow.status).toBe("failed");

    const conversion = marketing.recordConversion({ campaignId: 1, orderNumber: "BZ-NOTICE", revenue: 10 });
    expect(conversion.code).toBe("PAYMENT_UNVERIFIED");
    expect(conversion.stored).toBe(false);
    expect(conversion.revenue).toBeNull();
    expect(conversion.reconciled).toBe(false);
  });

  it("does not turn an automation event or a dead letter into a sent customer message", () => {
    const shipped = notificationEngine.handleAutomationEvent({
      type: "order_delivered",
      idempotencyKey: "auto-delivered-1",
      payload: { email: "buyer@example.com", orderNumber: "BZ-AUTO", language: "de" },
    });
    expect(shipped.sent).toBe(false);
    expect(shipped.to).toBeNull();
    expect(shipped.code).toBe("CARRIER_NOT_LIVE");
    expect(JSON.stringify(shipped)).not.toContain("buyer@example.com");

    const first = automationEngine.emit("refund", { email: "buyer@example.com", orderNumber: "BZ-AUTO" }, { idempotencyKey: "refund-notice-1" });
    const second = automationEngine.emit("refund", { email: "buyer@example.com", orderNumber: "BZ-AUTO" }, { idempotencyKey: "refund-notice-1" });
    expect(first.sent).toBe(false);
    expect(first.customerNotified).toBe(false);
    expect(second.duplicate).toBe(true);
    expect(second.sent).toBe(false);

    const checkout = readiness.emitCheckoutNotification({ id: "chk-1", orderNumber: "BZ-AUTO", customerEmail: "buyer@example.com" });
    expect(checkout.queued).toBe(false);
    expect(checkout.sent).toBe(false);
    expect(readiness.getNotificationReadiness().deliveryMode).toBe("BLOCKED_EXTERNAL");

    const dead = enqueueDeadLetter({ type: "refund", email: "buyer@example.com" });
    expect(dead.queued).toBe(false);
    expect(dead.recovered).toBe(false);
    expect(JSON.stringify(dead)).not.toContain("buyer@example.com");
  });
});
