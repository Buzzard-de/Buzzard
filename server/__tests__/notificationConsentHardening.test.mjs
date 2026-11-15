import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { afterEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const engine = require("../lib/notificationEngine.js");
const consent = require("../lib/commerce/marketingConsentGate.js");

const queueFile = path.join(__dirname, "..", "data", "notification-queue.json");
const commerceDb = path.join(__dirname, "..", "data", "buzzard.db");

function statOf(file) {
  if (!fs.existsSync(file)) return null;
  const stat = fs.statSync(file);
  return { size: stat.size, mtimeMs: stat.mtimeMs };
}

function bindLedger(_customerId, live) {
  consent.bindConsentLedger({
    readAll() {
      return [];
    },
    readCustomer() {
      return live;
    },
  });
}

describe("notification consent hardening", () => {
  const queueBefore = statOf(queueFile);
  const dbBefore = statOf(commerceDb);

  afterEach(() => {
    consent.unbindConsentLedger();
    consent.clearConsentMemory();
    engine.releaseNotificationQueue();
  });

  it("denies an unknown event when an email address is present", () => {
    const result = engine.canSend({ email: "buyer@example.test", channel: "email" }, "unknown_promo");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("unknown_event_type");
    expect(result.sent).toBe(false);
    expect(result.productionReady).toBe(false);
    expect(result.salesOpen).toBe(false);
  });

  it("denies an unknown event for sms and push", () => {
    const sms = engine.canSend({ phone: "+490000", channel: "sms" }, "unknown_promo");
    const push = engine.canSend({ pushToken: "device-1", channel: "push" }, "unknown_promo");
    expect(sms.ok).toBe(false);
    expect(sms.reason).toBe("unknown_event_type");
    expect(push.ok).toBe(false);
    expect(push.reason).toBe("unknown_event_type");
  });

  it("does not let an email grant authorize sms", () => {
    bindLedger("cust-email-only", { email: "GRANTED", sms: "UNKNOWN", push: "UNKNOWN", marketing_tracking: "UNKNOWN" });
    const sms = engine.canSend({
      customerId: "cust-email-only",
      channel: "sms",
      phone: "+490000",
      email: "buyer@example.test",
      emailPermission: "GRANTED",
    }, "review_request");
    expect(sms.ok).toBe(false);
    expect(sms.reason).toBe("marketing_consent_required");
    expect(sms.smsPermission).toBe("UNKNOWN");
    expect(sms.emailPermission).toBe("GRANTED");
    expect(sms.callerFlagIgnored).toBe(true);
  });

  it("does not let an sms grant authorize email", () => {
    bindLedger("cust-sms-only", { email: "UNKNOWN", sms: "GRANTED", push: "UNKNOWN" });
    const email = engine.canSend({
      customerId: "cust-sms-only",
      channel: "email",
      email: "buyer@example.test",
      smsPermission: "GRANTED",
    }, "review_request");
    expect(email.ok).toBe(false);
    expect(email.emailPermission).toBe("UNKNOWN");
    expect(email.smsPermission).toBe("GRANTED");
  });

  it("does not let a push grant authorize email", () => {
    bindLedger("cust-push-only", { email: "UNKNOWN", sms: "UNKNOWN", push: "GRANTED" });
    const email = engine.canSend({
      customerId: "cust-push-only",
      channel: "email",
      email: "buyer@example.test",
      pushPermission: "GRANTED",
    }, "review_request");
    expect(email.ok).toBe(false);
    expect(email.emailPermission).toBe("UNKNOWN");
    expect(email.pushPermission).toBe("GRANTED");
  });

  it("denies marketing when the ledger is unavailable", () => {
    consent.bindConsentLedger({
      readAll() {
        return [];
      },
      readCustomer() {
        throw new Error("ledger down");
      },
    });
    consent.readMarketingConsent("cust-down");
    const result = engine.canSend({
      customerId: "cust-down",
      channel: "email",
      email: "buyer@example.test",
    }, "review_request");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("consent_store_unavailable");
    expect(result.sent).toBe(false);
  });

  it("denies marketing for UNKNOWN, WITHDRAWN, BLOCKED, and CLOSED", () => {
    const unknown = engine.canSend({
      customerId: "cust-unknown",
      channel: "email",
      email: "buyer@example.test",
    }, "review_request");
    expect(unknown.ok).toBe(false);
    expect(unknown.reason).toBe("marketing_consent_required");
    expect(unknown.emailPermission).toBe("UNKNOWN");

    consent.decideMarketingConsent({
      idempotencyKey: "harden-withdraw",
      customerId: "cust-withdrawn",
      channel: "email",
      action: "withdraw",
      source: "account-settings",
      scope: "marketing-email",
      consentedAt: "2020-01-01T00:00:00.000Z",
    });
    const withdrawn = engine.canSend({
      customerId: "cust-withdrawn",
      channel: "email",
      email: "buyer@example.test",
    }, "review_request");
    expect(withdrawn.ok).toBe(false);
    expect(withdrawn.emailPermission).toBe("WITHDRAWN");

    consent.decideMarketingConsent({
      idempotencyKey: "harden-blocked",
      customerId: "cust-blocked",
      channel: "sms",
      action: "grant",
      consent: true,
      source: "account-settings",
      scope: "marketing-sms",
      consentedAt: "2020-01-01T00:00:00.000Z",
    });
    const blocked = engine.canSend({
      customerId: "cust-blocked",
      channel: "sms",
      phone: "+490000",
    }, "review_request");
    expect(blocked.ok).toBe(false);
    expect(blocked.smsPermission).toBe("BLOCKED");

    consent.decideMarketingConsent({
      idempotencyKey: "harden-closed",
      customerId: "cust-closed",
      channel: "push",
      timeout: true,
    });
    const closed = engine.canSend({
      customerId: "cust-closed",
      channel: "push",
      pushToken: "device-1",
    }, "review_request");
    expect(closed.ok).toBe(false);
    expect(closed.pushPermission).toBe("CLOSED");
  });

  it("does not treat a legacy marketing flag or tracking grant as channel consent", () => {
    const legacy = engine.canSend({
      customerId: "cust-legacy",
      channel: "email",
      email: "buyer@example.test",
      marketing_email: 1,
      emailOptIn: true,
      marketingConsent: true,
    }, "review_request");
    expect(legacy.ok).toBe(false);
    expect(legacy.reason).toBe("marketing_consent_required");
    expect(legacy.callerFlagIgnored).toBe(true);

    for (const channel of ["email", "sms", "push"]) {
      const result = engine.canSend({
        customerId: "cust-tracking",
        channel,
        email: "buyer@example.test",
        phone: "+490000",
        pushToken: "device-1",
        marketing_tracking: "GRANTED",
      }, "review_request");
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("marketing_consent_required");
    }
  });

  it("stops a missing recipient before the hub", () => {
    const decision = engine.canSend({ customerId: "cust-none", channel: "email" }, "review_request");
    expect(decision.ok).toBe(false);
    expect(decision.reason).toBe("no_recipient");
    const event = engine.handleAutomationEvent({
      type: "review_request",
      idempotencyKey: "no-recipient-1",
      payload: { customerId: "cust-none", channel: "sms" },
    });
    expect(event.sent).toBe(false);
    expect(event.queued).toBe(false);
    expect(event.reason).toBe("no_recipient");
    expect(event.code).toBe("no_recipient");
    expect(event.live).toBe(false);
  });

  it("does not queue an unknown event or send marketing without consent", () => {
    const isolated = engine.isolateNotificationQueue();
    const queued = engine.queueNotification({
      type: "unknown_promo",
      email: "buyer@example.test",
      channel: "email",
    });
    expect(queued.ok).toBe(false);
    expect(queued.queued).toBe(false);
    expect(queued.stored).toBe(false);
    expect(queued.reason).toBe("unknown_event_type");
    expect(isolated).toEqual([]);

    const marketing = engine.handleAutomationEvent({
      type: "review_request",
      idempotencyKey: "marketing-closed-1",
      payload: { customerId: "cust-none", channel: "email", email: "buyer@example.test", marketing_email: 1 },
    });
    expect(marketing.sent).toBe(false);
    expect(marketing.queued).toBe(false);
    expect(marketing.reason).toBe("marketing_consent_required");
    expect(marketing.code).not.toBe("PROVIDER_NOT_LIVE");
    expect(statOf(queueFile)).toEqual(queueBefore);
  });

  it("does not let a transactional event act as marketing, and authorizes only a verified order notice", () => {
    const marketed = engine.canSend({
      customerId: "cust-order",
      orderCustomerId: "cust-order",
      orderNumber: "BZ-1",
      orderNumberOnRecord: "BZ-1",
      orderVerified: true,
      purpose: "order_status",
      channel: "email",
      email: "buyer@example.test",
      marketingConsent: true,
    }, "new_order");
    expect(marketed.ok).toBe(false);
    expect(marketed.reason).toBe("transactional_not_marketing");

    const claimed = engine.canSend({
      customerId: "cust-order",
      orderCustomerId: "cust-order",
      orderNumber: "BZ-1",
      orderNumberOnRecord: "BZ-1",
      orderVerified: true,
      verified: true,
      purpose: "order_status",
      channel: "email",
      email: "buyer@example.test",
    }, "new_order");
    expect(claimed.ok).toBe(false);
    expect(claimed.reason).toBe("repository_unavailable");
    expect(claimed.sent).toBe(false);
    expect(claimed.productionReady).toBe(false);

    const isolated = engine.isolateNotificationQueue();
    const stored = engine.queueNotification({
      type: "new_order",
      customerId: "cust-order",
      orderCustomerId: "cust-order",
      orderNumber: "BZ-1",
      orderNumberOnRecord: "BZ-1",
      orderVerified: true,
      purpose: "order_status",
      channel: "email",
      email: "buyer@example.test",
    });
    expect(stored.queued).toBe(false);
    expect(stored.stored).toBe(false);
    expect(stored.sent).toBe(false);
    expect(stored.reason).toBe("repository_unavailable");
    expect(isolated).toEqual([]);
    expect(statOf(queueFile)).toEqual(queueBefore);
    expect(statOf(commerceDb)).toEqual(dbBefore);
  });
});
