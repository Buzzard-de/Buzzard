import { describe, it, expect, beforeAll } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

describe("alert and notification delivery — established fail-closed (not live SMTP/webhook/pager)", () => {
  let software;
  let db;

  beforeAll(() => {
    software = require("../lib/software");
    db = require("../lib/db").db;
    software.initialize(db);
  });

  it("notification engine never sends even when SMTP env is present", () => {
    const engine = require("../lib/notificationEngine");
    const prevHost = process.env.SMTP_HOST;
    const prevUser = process.env.SMTP_USER;
    process.env.SMTP_HOST = "smtp.example.invalid";
    process.env.SMTP_USER = "operator";
    try {
      const dispatch = engine.dispatchEmail({ channel: "email", to: "ops@example.invalid" });
      expect(dispatch.status).toBe("SEND_BLOCKED");
      expect(dispatch.sent).toBe(false);
      expect(dispatch.smtp).toBe(false);
      expect(dispatch.smtpConfiguredIgnored).toBe(true);
      expect(dispatch.live).toBe(false);

      const handled = engine.handleAutomationEvent({
        id: `evt-notify-${Date.now()}`,
        type: "new_order",
        payload: { email: "ops@example.invalid", orderNumber: "ORD-LOCAL-1", language: "de" },
      });
      expect(handled.sent).toBe(false);
      expect(handled.queued).toBe(true);
      expect(handled.delivered).toBe(false);
      expect(handled.live).toBe(false);
      expect(handled.reason).toBe("SMTP_SEND_BLOCKED");

      expect(engine.confirmDelivery().reason).toBe("DELIVERY_CONFIRM_BLOCKED");
      expect(engine.inboundProviderWebhook().reason).toBe("PROVIDER_WEBHOOK_BLOCKED");
      expect(engine.inboundProviderWebhook().httpAttempted).toBe(false);
    } finally {
      if (prevHost === undefined) delete process.env.SMTP_HOST;
      else process.env.SMTP_HOST = prevHost;
      if (prevUser === undefined) delete process.env.SMTP_USER;
      else process.env.SMTP_USER = prevUser;
    }
  });

  it("communications confirm/inbound do not mark customer messages delivered", () => {
    const drafted = software.communications.draft(db, {
      channel: "email",
      customerId: "cust-notify",
      message: "Siparisim nerede?",
    });
    expect(drafted.sent).toBe(false);
    expect(software.communications.confirmDelivery().reason).toBe("DELIVERY_CONFIRM_BLOCKED");
    expect(software.communications.inboundDeliveryWebhook().reason).toBe("INBOUND_DELIVERY_WEBHOOK_BLOCKED");
    expect(software.communications.markSentOrDelivered().reason).toBe("HUMAN_SEND_REQUIRED");
    const approved = software.communications.approveSend({ actor: "operator" });
    expect(approved.reason).toBe("HUMAN_SEND_REQUIRED");
    expect(approved.sent).toBe(false);
  });

  it("notification hub blocks every external channel including Slack/Teams", () => {
    const hub = require("../lib/notificationHub");
    for (const channel of ["email", "sms", "push", "whatsapp", "slack", "teams"]) {
      const result = hub.deliverNotification({ channel, body: "test" });
      expect(result.status).toBe("BLOCKED");
      expect(result.sent).toBe(false);
      expect(result.live).toBe(false);
    }
    const internal = hub.deliverNotification({ channel: "internal", body: "ops" });
    expect(internal.status).toBe("DELIVERED");
    expect(internal.live).toBe(false);
    expect(internal.sent).toBe(false);
    expect(hub.confirmDelivery().reason).toBe("DELIVERY_CONFIRM_BLOCKED");
  });

  it("local alerts generate but never confirm SMTP/webhook/pager delivery", () => {
    const alerts = require("../lib/operations/localAlerts");
    const generated = alerts.generateLocalAlerts({
      overall: "WARNING",
      activeRules: [{ rule: "worker_failure", level: "CRITICAL", message: "down", retryable: true }],
    });
    expect(generated.liveDispatch).toBe(false);
    expect(generated.alerts[0].dispatched).toBe(false);

    const prev = process.env.SLACK_WEBHOOK_URL;
    process.env.SLACK_WEBHOOK_URL = "https://example.invalid/hook";
    try {
      const dispatched = alerts.dispatch({ actor: "operator", forceDispatch: true });
      expect(dispatched.reason).toBe("ALERT_DISPATCH_BLOCKED");
      expect(dispatched.webhookSent).toBe(false);
      expect(dispatched.httpAttempted).toBe(false);
      const confirmed = alerts.confirmDelivery();
      expect(confirmed.reason).toBe("ALERT_DELIVERY_CONFIRM_BLOCKED");
      expect(confirmed.pager).toBe(false);
    } finally {
      if (prev === undefined) delete process.env.SLACK_WEBHOOK_URL;
      else process.env.SLACK_WEBHOOK_URL = prev;
    }
  });

  it("notification readiness treats SMTP presence as not live", () => {
    const notif = require("../lib/customer/customerNotificationReadiness");
    const prevHost = process.env.SMTP_HOST;
    const prevUser = process.env.SMTP_USER;
    process.env.SMTP_HOST = "smtp.example.invalid";
    process.env.SMTP_USER = "operator";
    try {
      const readiness = notif.getNotificationReadiness();
      expect(readiness.smtpConfigured).toBe(true);
      expect(readiness.deliveryMode).toBe("smtp_configured_not_live");
      expect(readiness.liveSend).toBe(false);
      expect(readiness.smtpConfiguredDoesNotSend).toBe(true);
      expect(readiness.realEmailSendWhileSalesOff).toBe(false);
    } finally {
      if (prevHost === undefined) delete process.env.SMTP_HOST;
      else process.env.SMTP_HOST = prevHost;
      if (prevUser === undefined) delete process.env.SMTP_USER;
      else process.env.SMTP_USER = prevUser;
    }
  });
});
