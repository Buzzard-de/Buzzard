import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const admission = require("../lib/notificationAdmission.js");
const engine = require("../lib/automationEngine.js");
const notifications = require("../lib/notificationEngine.js");
const hub = require("../lib/notificationHub.js");
const control = require("../lib/controlCenterJobAdmission.js");

const emailGrant = { channel: "email", status: "GRANTED", verified: true };
const smsGrant = { channel: "sms", status: "GRANTED", verified: true };
const pushGrant = { channel: "push", status: "GRANTED", verified: true };
const operational = { trusted: true, verified: true, source: "warehouse", status: "low" };
const transaction = { trusted: true, verified: true, orderNumber: "BZ-1", source: "orders_plugin", status: "created" };

function memoryDeps() {
  const state = { approvals: [] };
  return {
    state,
    deps: {
      newId: () => "auto_notice_1",
      createApproval(input) {
        const approval = {
          id: "appr_notice",
          taskId: input.taskId,
          resourceType: input.resourceType,
          resourceId: input.resourceId,
          status: "PENDING",
          metadata: input.metadata,
        };
        state.approvals.push(approval);
        return approval;
      },
    },
  };
}

function approved(jobId, jobType = "low_stock") {
  return {
    id: "appr_ok",
    status: "APPROVED",
    resourceType: "notification",
    metadata: {
      origin: "notification",
      jobId,
      consumed: false,
      spec: { source: "notification", jobType, dryRun: true },
    },
  };
}

describe("notification admission", () => {
  it("keeps marketing grants channel-specific and rejects legacy booleans", () => {
    expect(admission.decideNotification({ eventType: "abandoned_cart", channel: "email", consent: true }).code).toBe("MARKETING_CONSENT_REQUIRED");
    expect(admission.decideNotification({ eventType: "review_request", channel: "sms", consent: 1 }).code).toBe("MARKETING_CONSENT_REQUIRED");
    expect(admission.decideNotification({
      eventType: "abandoned_cart",
      channel: "email",
      consent: { marketing_email: 1, channel: "email", status: "GRANTED", verified: true },
    }).code).toBe("MARKETING_CONSENT_REQUIRED");
    expect(admission.decideNotification({ eventType: "abandoned_cart", channel: "email", consent: emailGrant }).code).toBe("DRY_RUN");
    expect(admission.decideNotification({ eventType: "abandoned_cart", channel: "sms", consent: emailGrant }).code).toBe("MARKETING_CONSENT_REQUIRED");
    expect(admission.decideNotification({ eventType: "abandoned_cart", channel: "push", consent: smsGrant }).code).toBe("MARKETING_CONSENT_REQUIRED");
    expect(admission.decideNotification({ eventType: "abandoned_cart", channel: "push", consent: pushGrant }).providerCalled).toBe(false);
    expect(admission.decideNotification({ eventType: "abandoned_cart", channel: "whatsapp", consent: { channel: "whatsapp", status: "GRANTED", verified: true } }).code).toBe("WHATSAPP_CLOSED");
  });

  it("separates transactional proof from marketing consent", () => {
    expect(admission.decideNotification({
      eventType: "payment_confirmed",
      channel: "email",
      consent: emailGrant,
    }).code).toBe("TRANSACTION_UNVERIFIED");
    expect(admission.decideNotification({
      eventType: "abandoned_cart",
      channel: "email",
      transaction,
    }).code).toBe("MARKETING_CONSENT_REQUIRED");
    const preview = admission.decideNotification({ eventType: "new_order", channel: "email", transaction });
    expect(preview.ok).toBe(true);
    expect(preview.dryRun).toBe(true);
    expect(preview.sent).toBe(false);
    expect(preview.providerCalled).toBe(false);
    expect(admission.callProvider().called).toBe(false);
  });

  it("holds operational and AI notices on one core approval", () => {
    const { state, deps } = memoryDeps();
    const held = admission.holdOperationalNotice({
      eventType: "low_stock",
      channel: "email",
      operational,
      actor: "ai_notification",
      subjectId: "sku-1",
      deps,
      aiInitiated: true,
    });
    expect(held.pendingApproval).toBe(true);
    expect(held.sent).toBe(false);
    expect(held.providerCalled).toBe(false);
    expect(held.job).toBeNull();
    expect(held.approval.status).toBe("PENDING");
    expect(held.approval.resourceType).toBe("notification");
    expect(state.approvals).toHaveLength(1);
    expect(control.planApprovalDecision(held.approval, "approve").action).toBe("none");

    const approval = approved(held.jobId, "low_stock");
    const once = admission.decideNotification({
      eventType: "low_stock",
      channel: "sms",
      operational,
      approval,
      jobId: held.jobId,
      aiInitiated: true,
    });
    expect(once.ok).toBe(true);
    expect(once.dryRun).toBe(true);
    expect(admission.decideNotification({
      eventType: "low_stock",
      channel: "sms",
      operational,
      approval,
      jobId: "auto_other",
      aiInitiated: true,
    }).code).toBe("APPROVAL_JOB_MISMATCH");
    approval.metadata.consumed = true;
    expect(admission.decideNotification({
      eventType: "low_stock",
      operational,
      approval,
      jobId: held.jobId,
    }).code).toBe("APPROVAL_ALREADY_USED");
    expect(admission.decideNotification({
      eventType: "supplier_import_failure",
      channel: "push",
      aiInitiated: true,
    }).code).toBe("OPERATIONAL_SOURCE_UNVERIFIED");

    const emitted = engine.emit("low_stock", { productId: "sku-1", marketingConsent: true }, {
      isolate: true,
      origin: "ai",
      deps,
      operational,
      actor: "ai_notification",
    });
    expect(emitted.pendingApproval).toBe(true);
    expect(emitted.sent).toBe(false);
    expect(emitted.providerCalled).toBe(false);
    expect(emitted.job).toBeNull();
    expect(emitted.dryRun).toBe(true);
  });

  it("refuses direct, retried, and scheduled sends without a provider call", () => {
    const recorded = [];
    const forged = engine.emit(
      "abandoned_cart",
      { email: "person@example.test", marketingConsent: true, verified: true, trusted: true },
      { isolate: true, record: (event) => recorded.push(event) }
    );
    expect(forged.code).toBe("MARKETING_CONSENT_REQUIRED");
    expect(forged.sent).toBe(false);
    expect(forged.providerCalled).toBe(false);
    expect(recorded[0].status).toBe("refused");

    const handled = notifications.handleAutomationEvent({
      type: "review_request",
      payload: { email: "person@example.test", marketingConsent: true },
    });
    expect(handled.sent).toBe(false);
    expect(handled.dispatch.smtp).toBe(false);
    expect(handled.dispatch.providerCalled).toBe(false);

    const scheduled = notifications.scheduleNotification(
      { eventType: "review_request", channel: "email" },
      { consent: emailGrant }
    );
    expect(scheduled.ok).toBe(true);
    expect(scheduled.scheduled).toBe(false);
    expect(scheduled.armed).toBe(false);
    expect(scheduled.providerCalled).toBe(false);
    expect(notifications.retryNotification({ eventType: "review_request", channel: "sms" }).code).toBe("MARKETING_CONSENT_REQUIRED");

    expect(hub.deliverNotification({ channel: "whatsapp", eventType: "new_order" }).code).toBe("WHATSAPP_CLOSED");
    expect(hub.deliverNotification({ channel: "email", eventType: "payment_confirmed" }).providerCalled).toBe(false);
    expect(notifications.queueNotification({ to: "person@example.test" }).queued).toBe(false);
  });

  it("lets a support reply stay in-app and blocks commercial actions", () => {
    const reply = admission.evaluateSupportReply("Kargonuz yolda.");
    expect(reply.ok).toBe(true);
    expect(reply.channel).toBe("in_app");
    expect(reply.commercialAction).toBe(false);
    const blocked = admission.evaluateSupportReply({ action: "refund", orderNumber: "BZ-1" });
    expect(blocked.code).toBe("SUPPORT_COMMERCIAL_ACTION_REFUSED");
    expect(blocked.executed).toBe(false);
    expect(admission.evaluateSupportReply({ payment: { amount: 10 } }).code).toBe("SUPPORT_COMMERCIAL_ACTION_REFUSED");
    expect(admission.decideCustomerNotice({ channel: "whatsapp", message: "Merhaba" }).code).toBe("WHATSAPP_CLOSED");
    expect(admission.decideCustomerNotice({
      channel: "email",
      message: "Sepetiniz duruyor",
      eventType: "abandoned_cart",
    }).code).toBe("CUSTOMER_NOTICE_CHANNEL_MISUSE");
    const notice = admission.decideCustomerNotice({ channel: "email", message: "Talebiniz alındı." });
    expect(notice.ok).toBe(true);
    expect(notice.providerCalled).toBe(false);
    expect(notice.dryRun).toBe(true);
  });
});
