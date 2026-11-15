import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const engine = require("../lib/notificationEngine.js");
const { deliverNotification } = require("../lib/notificationHub.js");

const SUCCESS_COPY = /confirmed|bestätigt|onaylandı|delivered|zugestellt|teslim edildi|shipped|versendet|kargoya verildi|bezahlt|processed|işlendi/i;

describe("customer notices stay unverified", () => {
  it("binds a notice to the customer and order, and withholds success copy", () => {
    const mismatch = engine.prepareCustomerNotice({
      idempotencyKey: "mismatch-1",
      eventType: "refund",
      channel: "email",
      customerId: "cust-1",
      orderCustomerId: "cust-2",
      orderNumber: "BZ-OTHER",
      email: "buyer@example.com",
    });
    expect(mismatch.code).toBe("CUSTOMER_ORDER_MISMATCH");
    expect(mismatch.template).toBeNull();
    expect(mismatch.orderNumber).toBeNull();
    expect(mismatch.sent).toBe(false);
    expect(JSON.stringify(mismatch)).not.toContain("buyer@example.com");
    expect(JSON.stringify(mismatch)).not.toContain("BZ-OTHER");

    const payment = engine.prepareCustomerNotice({
      idempotencyKey: "pay-1",
      eventType: "payment_confirmed",
      channel: "sms",
      customerId: "cust-1",
      orderCustomerId: "cust-1",
      orderNumber: "BZ-100",
      paymentVerified: false,
      email: "buyer@example.com",
    });
    expect(payment.code).toBe("repository_unavailable");
    expect(payment.status).toBe("BLOCKED_EXTERNAL");
    expect(payment.customerId).toBe("cust-1");
    expect(payment.orderNumber).toBe("BZ-100");
    expect(payment.customerVisible).toBe("UNVERIFIED");
    expect(payment.template.subject).toContain("BZ-100");
    expect(`${payment.template.subject} ${payment.template.body}`).not.toMatch(SUCCESS_COPY);
    expect(JSON.stringify(payment)).not.toContain("buyer@example.com");

    const wrongOrder = engine.prepareCustomerNotice({
      idempotencyKey: "order-mismatch",
      eventType: "new_order",
      channel: "in_app",
      customerId: "cust-1",
      orderNumber: "BZ-100",
      orderNumberOnRecord: "BZ-999",
      orderVerified: true,
    });
    expect(wrongOrder.code).toBe("CUSTOMER_ORDER_MISMATCH");
    expect(wrongOrder.sent).toBe(false);
  });

  it("keeps email, sms, and in-app channels unsent for claimed facts", () => {
    const email = engine.prepareCustomerNotice({
      idempotencyKey: "email-order",
      eventType: "new_order",
      channel: "email",
      customerId: "cust-1",
      orderNumber: "BZ-200",
      orderVerified: true,
    });
    const sms = engine.prepareCustomerNotice({
      idempotencyKey: "sms-pay",
      eventType: "payment_confirmed",
      channel: "sms",
      customerId: "cust-1",
      orderNumber: "BZ-200",
      paymentVerified: true,
    });
    const inApp = engine.prepareCustomerNotice({
      idempotencyKey: "app-cancel",
      eventType: "order_cancelled",
      channel: "in_app",
      customerId: "cust-1",
      orderNumber: "BZ-200",
      cancellationVerified: true,
    });
    const shipment = engine.prepareCustomerNotice({
      idempotencyKey: "mail-ship",
      eventType: "order_shipped",
      channel: "email",
      customerId: "cust-1",
      orderNumber: "BZ-200",
      shipmentVerified: true,
      delivered: true,
    });
    const delivery = engine.prepareCustomerNotice({
      idempotencyKey: "mail-delivered",
      eventType: "order_delivered",
      channel: "email",
      customerId: "cust-1",
      orderNumber: "BZ-200",
      deliveryVerified: true,
    });
    expect(email.code).toBe("repository_unavailable");
    expect(email.channel).toBe("email");
    expect(sms.code).toBe("repository_unavailable");
    expect(sms.channel).toBe("sms");
    expect(inApp.code).toBe("repository_unavailable");
    expect(inApp.channel).toBe("in_app");
    expect(shipment.code).toBe("repository_unavailable");
    expect(delivery.code).toBe("repository_unavailable");
    for (const result of [email, sms, inApp, shipment, delivery]) {
      expect(result.sent).toBe(false);
      expect(result.queued).toBe(false);
      expect(result.deliveryConfirmed).toBe(false);
      expect(result.customerNotified).toBe(false);
      expect(result.status).not.toBe("SENT");
      expect(result.status).not.toBe("QUEUED");
      expect(result.status).not.toBe("DELIVERY_CONFIRMED");
      expect(`${result.template.subject} ${result.template.body}`).not.toMatch(SUCCESS_COPY);
    }
    const general = deliverNotification({ channel: "in_app", idempotencyKey: "app-general" });
    expect(general.code).toBe("INTERNAL_NOT_DELIVERY");
    expect(general.sent).toBe(false);
  });

  it("rejects a duplicate and retries a failed notice without sending it", () => {
    const unverified = engine.prepareCustomerNotice({
      idempotencyKey: "retry-unverified",
      eventType: "refund",
      channel: "email",
      customerId: "cust-9",
      orderNumber: "BZ-300",
      refundVerified: true,
      timeout: true,
      email: "buyer@example.com",
    });
    expect(unverified.code).toBe("repository_unavailable");
    expect(unverified.sent).toBe(false);

    const fixture = engine.openIsolatedOrderFixture(path.join(os.tmpdir(), `buzzard-notice-retry-${process.pid}.sqlite`));
    fixture.insertOrder({
      orderNumber: "BZ-300",
      customerId: "cust-9",
      status: "refunded",
      purpose: "refund",
    });
    const failed = engine.prepareCustomerNotice({
      idempotencyKey: "retry-1",
      eventType: "refund",
      channel: "email",
      customerId: "cust-9",
      orderNumber: "BZ-300",
      refundVerified: true,
      timeout: true,
      email: "buyer@example.com",
    });
    fixture.close();
    expect(failed.code).toBe("TIMEOUT");
    expect(failed.status).toBe("FAILED");
    expect(failed.attempts).toBe(1);
    expect(failed.sent).toBe(false);

    const duplicate = engine.prepareCustomerNotice({
      idempotencyKey: "retry-1",
      eventType: "refund",
      channel: "email",
      customerId: "cust-9",
      orderNumber: "BZ-300",
      refundVerified: true,
    });
    expect(duplicate.code).toBe("DUPLICATE_NOTIFICATION");
    expect(duplicate.duplicate).toBe(true);
    expect(duplicate.sent).toBe(false);
    expect(duplicate.attempts).toBe(1);

    const retried = engine.retryCustomerNotice("retry-1");
    expect(retried.code).toBe("TIMEOUT");
    expect(retried.status).toBe("FAILED");
    expect(retried.attempts).toBe(2);
    expect(retried.sent).toBe(false);
    expect(retried.customerNotified).toBe(false);
    expect(engine.retryCustomerNotice("missing-notice").code).toBe("RETRY_UNKNOWN");

    const errors = engine.listNoticeErrors().filter((entry) => entry.key === "retry-1");
    expect(errors.map((entry) => entry.attempts)).toEqual([1, 2]);
    expect(JSON.stringify(errors)).not.toContain("buyer@example.com");
    expect(errors.every((entry) => entry.orderNumber === "BZ-300")).toBe(true);
  });
});

describe("FIN-M26 recovery send stays closed", () => {
  const consent = require("../lib/commerce/marketingConsentGate.js");
  const old = "2020-01-01T00:00:00.000Z";
  const queueFile = path.join(__dirname, "..", "data", "notification-queue.json");

  function abandoned(extra = {}) {
    return {
      cartStatus: "abandoned",
      abandonedAt: old,
      channel: "email",
      permission: true,
      ok: true,
      status: 200,
      authorized: true,
      email: "buyer@example.test",
      ...extra,
    };
  }

  function expectClosed(result) {
    expect(result.ok).toBe(false);
    expect(result.queued).toBe(false);
    expect(result.sent).toBe(false);
    expect(result.notificationSent).toBe(false);
    expect(result.customerNotified).toBe(false);
    expect(result.messageSent).toBe(false);
    expect(result.emailSent).toBe(false);
    expect(result.smsSent).toBe(false);
    expect(result.pushSent).toBe(false);
    expect(result.status).not.toBe(200);
    expect(JSON.stringify(result)).not.toContain("buyer@example.test");
  }

  function withdraw(customerId, channel) {
    consent.decideMarketingConsent({
      idempotencyKey: `m26-send-withdraw-${customerId}-${channel}`,
      customerId,
      channel,
      action: "withdraw",
      source: "account-settings",
      scope: `marketing-${channel}`,
      consentedAt: old,
    });
  }

  it("does not queue or send a recovery notice without channel authority", () => {
    const before = fs.existsSync(queueFile) ? fs.readFileSync(queueFile, "utf8") : null;
    withdraw("cust-m26-send-email", "email");
    withdraw("cust-m26-send-sms", "sms");
    withdraw("cust-m26-send-push", "push");

    const sms = engine.canSend(abandoned({
      idempotencyKey: "m26-send-sms",
      customerId: "cust-m26-send-email",
      cartCustomerId: "cust-m26-send-email",
      cartId: "cart-send-sms",
      channel: "sms",
      emailPermission: "GRANTED",
    }), "abandoned_cart");
    expectClosed(sms);
    expect(sms.code).toBe("CONSENT_UNKNOWN");
    expect(sms.smsPermission).toBe("UNKNOWN");
    expect(sms.emailPermission).toBe("WITHDRAWN");

    const push = engine.canSend(abandoned({
      idempotencyKey: "m26-send-push",
      customerId: "cust-m26-send-sms",
      cartCustomerId: "cust-m26-send-sms",
      cartId: "cart-send-push",
      channel: "push",
      smsPermission: "GRANTED",
    }), "abandoned_cart");
    expectClosed(push);
    expect(push.code).toBe("CONSENT_UNKNOWN");
    expect(push.pushPermission).toBe("UNKNOWN");
    expect(push.smsPermission).toBe("WITHDRAWN");

    const email = engine.canSend(abandoned({
      idempotencyKey: "m26-send-email",
      customerId: "cust-m26-send-push",
      cartCustomerId: "cust-m26-send-push",
      cartId: "cart-send-email",
      channel: "email",
      pushPermission: "GRANTED",
    }), "abandoned_cart");
    expectClosed(email);
    expect(email.code).toBe("CONSENT_UNKNOWN");
    expect(email.emailPermission).toBe("UNKNOWN");
    expect(email.pushPermission).toBe("WITHDRAWN");

    const unknown = engine.canSend(abandoned({
      idempotencyKey: "m26-send-unknown",
      customerId: "cust-m26-send-unknown",
      cartCustomerId: "cust-m26-send-unknown",
      cartId: "cart-send-unknown",
    }), "cart_recovered");
    expectClosed(unknown);
    expect(unknown.code).toBe("CONSENT_UNKNOWN");
    expect(unknown.status).toBe("UNKNOWN");

    const blocked = engine.canSend(abandoned({
      idempotencyKey: "m26-send-blocked",
      customerId: "cust-m26-send-blocked",
      cartCustomerId: "cust-m26-send-blocked",
      cartId: "cart-send-blocked",
      cartStatus: "cancelled",
    }), "abandoned_cart");
    expectClosed(blocked);
    expect(blocked.code).toBe("CART_CANCELLED");
    expect(blocked.status).toBe("BLOCKED");

    const timedOut = engine.canSend(abandoned({
      idempotencyKey: "m26-send-timeout",
      customerId: "cust-m26-send-timeout",
      cartCustomerId: "cust-m26-send-timeout",
      cartId: "cart-send-timeout",
      timeout: true,
    }), "abandoned_cart");
    expectClosed(timedOut);
    expect(timedOut.code).toBe("TIMEOUT");
    expect(timedOut.status).toBe("FAILED");

    const withdrawn = engine.canSend(abandoned({
      idempotencyKey: "m26-send-withdrawn",
      customerId: "cust-m26-send-email",
      cartCustomerId: "cust-m26-send-email",
      cartId: "cart-send-withdrawn",
      channel: "email",
    }), "abandoned_cart");
    expectClosed(withdrawn);
    expect(withdrawn.code).toBe("CONSENT_WITHDRAWN");
    expect(withdrawn.status).toBe("BLOCKED");
    expect(withdrawn.smsPermission).toBe("UNKNOWN");
    expect(withdrawn.pushPermission).toBe("UNKNOWN");

    const after = fs.existsSync(queueFile) ? fs.readFileSync(queueFile, "utf8") : null;
    expect(after).toBe(before);
  });
});
