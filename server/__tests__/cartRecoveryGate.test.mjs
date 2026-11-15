import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const crm = require("../lib/crmLoyalty.js");
const consent = require("../lib/commerce/marketingConsentGate.js");
const analytics = require("../lib/analyticsDashboard.js");
const marketing = require("../lib/marketingCenter.js");
const { db } = require("../lib/db");

const secretEmail = "recovery-secret@example.test";

function counts() {
  return {
    recovered: db.prepare("SELECT COUNT(*) n FROM abandoned_carts WHERE status = 'recovered'").get().n,
    orders: db.prepare("SELECT COUNT(*) n FROM commerce_orders").get().n,
    coupons: db.prepare("SELECT COUNT(*) n FROM coupons").get().n,
    recovery: db.prepare("SELECT COUNT(*) n FROM recovery_campaigns").get().n,
    offers: db.prepare("SELECT COUNT(*) n FROM offers").get().n,
    ledger: db.prepare("SELECT COUNT(*) n FROM loyalty_ledger").get().n,
    conversions: db.prepare("SELECT COUNT(*) n FROM marketing_campaign_conversions").get().n,
    analyticsEvents: db.prepare("SELECT COUNT(*) n FROM analytics_events").get().n,
    marketingEvents: db.prepare("SELECT COUNT(*) n FROM marketing_center_events").get().n,
    spend: db.prepare("SELECT COUNT(*) n FROM marketing_campaign_spend").get().n,
  };
}

function user() {
  return db.prepare("INSERT INTO users(email, password_hash, role, name) VALUES(?,?,?,?)").run(
    `recover-${Date.now()}-${Math.random().toString(16).slice(2)}@example.test`,
    "x",
    "customer",
    "Recover"
  ).lastInsertRowid;
}

describe("markCartRecovered does not record a sale", () => {
  it("ignores recovered and converted flags and does not write a second conversion", async () => {
    const id = user();
    db.prepare(
      "INSERT INTO abandoned_carts(user_id, cart_key, subtotal, currency, item_count, status) VALUES(?,?,?,?,?, 'open')"
    ).run(id, `cart-${id}`, 42, "EUR", 1);
    const before = counts();
    const first = crm.markCartRecovered(id, {
      recovered: true,
      converted: true,
      purchased: true,
      paid: true,
      successful: true,
      orderNumber: "BZ-RECOVER",
      paymentId: "pay-recover",
      email: secretEmail,
    });
    expect(first.ok).toBe(false);
    expect(first.code).toBe("CART_OWNER_UNKNOWN");
    expect(first.status).toBe("UNKNOWN");
    expect(first.recovered).toBe(false);
    expect(first.converted).toBe(false);
    expect(first.purchased).toBe(false);
    expect(first.paid).toBe(false);
    expect(first.sale).toBe(false);
    expect(first.revenue).toBeNull();
    expect(first.orderCreated).toBe(false);
    expect(first.paymentCreated).toBe(false);
    expect(first.notificationSent).toBe(false);
    expect(first.customerNotified).toBe(false);
    expect(first.marketingPermission).toBe("UNKNOWN");
    expect(first.callerFlagIgnored).toBe(true);
    expect(first.reasons).toEqual(expect.arrayContaining(["SALES_CLOSED", "CART_OWNER_UNKNOWN"]));
    expect(JSON.stringify(first)).not.toContain(secretEmail);
    expect(db.prepare("SELECT status, recovered_at FROM abandoned_carts WHERE user_id = ?").get(id)).toEqual({
      status: "open",
      recovered_at: null,
    });

    const second = crm.markCartRecovered(id, { recovered: true, converted: true });
    expect(second.duplicate).toBe(true);
    expect(second.idempotent).toBe(true);
    expect(second.saleRecorded).toBe(false);
    const [left, right] = await Promise.all([
      Promise.resolve().then(() => crm.markCartRecovered(id, { paid: true, email: secretEmail })),
      Promise.resolve().then(() => crm.markCartRecovered(id, { successful: true, email: secretEmail })),
    ]);
    expect(left.ok).toBe(false);
    expect(right.ok).toBe(false);
    expect([left.duplicate, right.duplicate].filter(Boolean).length).toBe(2);
    expect(db.prepare("SELECT status FROM abandoned_carts WHERE user_id = ?").get(id).status).toBe("open");

    const status = crm.getCrmLoyaltyStatus();
    expect(status.totals.recoveredIsSale).toBe(false);
    expect(status.totals.revenue).toBeNull();
    expect(status.totals.salesFromRecovered).toBeNull();
    expect(status.totals.conversionCount).toBeNull();
    const listed = crm.listAbandonedCartsAdmin().find((row) => row.id);
    expect(listed.sale).toBe(false);
    expect(listed.revenue).toBeNull();
    expect(JSON.stringify(listed)).not.toContain(secretEmail);

    const after = counts();
    expect(after.recovered).toBe(before.recovered);
    expect(after.orders).toBe(before.orders);
    expect(after.coupons).toBe(before.coupons);
    expect(after.recovery).toBe(before.recovery);
    expect(after.offers).toBe(before.offers);
    expect(after.ledger).toBe(before.ledger);
    expect(after.conversions).toBe(before.conversions);
  });

  it("does not message a customer without consent or after withdrawal, and does not book the cart as revenue", () => {
    const openId = user();
    const withdrawnId = user();
    crm.upsertCrmProfile(withdrawnId, { marketingEmail: false, withdraw: true, email: secretEmail });
    const before = counts();
    const missing = crm.markCartRecovered(openId, { recovered: true, converted: true, email: secretEmail });
    const withdrawn = crm.markCartRecovered(withdrawnId, { recovered: true, paid: true, email: secretEmail });
    expect(missing.marketingPermission).toBe("UNKNOWN");
    expect(missing.notificationSent).toBe(false);
    expect(withdrawn.marketingPermission).toBe("UNKNOWN");
    expect(withdrawn.customerNotified).toBe(false);
    expect(withdrawn.campaignCreated).toBe(false);
    expect(JSON.stringify(withdrawn)).not.toContain(secretEmail);

    const points = crm.addPoints(withdrawnId, 25, "recovery", "BZ-RECOVER");
    expect(points.ok).toBe(false);
    expect(points.pointsApplied).toBe(false);
    expect(points.balance).toBeNull();

    const purchase = analytics.recordEvent({ eventType: "purchase", recovered: true, paid: true, email: secretEmail });
    expect(purchase.stored).toBe(false);
    expect(purchase.sale).toBe(false);
    expect(purchase.revenue).toBeNull();
    expect(purchase.code).toBe("SALES_CLOSED");
    const summary = analytics.getSummary();
    expect(summary.revenue).toBeNull();
    expect(summary.orders).toBeNull();
    expect(summary.purchases).toBeNull();
    expect(summary.conversionRate).toBeNull();
    expect(summary.recoveredIsSale).toBe(false);
    expect(analytics.getFunnel().purchases).toBeNull();
    expect(analytics.getFunnel().purchaseRate).toBeNull();
    expect(analytics.getDailySeries()).toEqual([]);

    const event = marketing.recordEvent({ eventType: "purchase", recovered: true, email: secretEmail });
    expect(event.stored).toBe(false);
    expect(event.sale).toBe(false);
    const spend = marketing.addCampaignSpend(1, { spend: 30, paid: true });
    expect(spend.stored).toBe(false);
    expect(spend.spend).toBeNull();
    expect(spend.code).toBe("SALES_CLOSED");
    const marketingSummary = marketing.getSummary();
    expect(marketingSummary.revenue).toBeNull();
    expect(marketingSummary.orders).toBeNull();
    expect(marketingSummary.recoveredIsSale).toBe(false);

    const after = counts();
    expect(after).toEqual(before);
  });
});

describe("FIN-M26 cart recovery stays closed", () => {
  const old = "2020-01-01T00:00:00.000Z";

  function abandoned(extra = {}) {
    return {
      cartStatus: "abandoned",
      abandonedAt: old,
      channel: "email",
      permission: true,
      ok: true,
      status: 200,
      authorized: true,
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
    expect(result.recovered).toBe(false);
    expect(result.orderCreated).toBe(false);
    expect(result.paymentCreated).toBe(false);
    expect(result.sale).toBe(false);
    expect(result.status).not.toBe(200);
    expect(result.callerPermissionIgnored).toBe(true);
  }

  function withdraw(customerId, channel) {
    consent.decideMarketingConsent({
      idempotencyKey: `m26-withdraw-${customerId}-${channel}`,
      customerId,
      channel,
      action: "withdraw",
      source: "account-settings",
      scope: `marketing-${channel}`,
      consentedAt: old,
    });
  }

  it("does not let one channel permission authorize another channel", () => {
    withdraw("cust-m26-email", "email");
    const sms = crm.markCartRecovered("cust-m26-email", abandoned({
      idempotencyKey: "m26-email-for-sms",
      customerId: "cust-m26-email",
      cartCustomerId: "cust-m26-email",
      cartId: "cart-m26-sms",
      channel: "sms",
      emailPermission: "GRANTED",
    }));
    expectClosed(sms);
    expect(sms.code).toBe("CONSENT_UNKNOWN");
    expect(sms.status).toBe("UNKNOWN");
    expect(sms.smsPermission).toBe("UNKNOWN");
    expect(sms.emailPermission).toBe("WITHDRAWN");
    expect(sms.pushPermission).toBe("UNKNOWN");

    withdraw("cust-m26-sms", "sms");
    const push = crm.markCartRecovered("cust-m26-sms", abandoned({
      idempotencyKey: "m26-sms-for-push",
      customerId: "cust-m26-sms",
      cartCustomerId: "cust-m26-sms",
      cartId: "cart-m26-push",
      channel: "push",
      smsPermission: "GRANTED",
    }));
    expectClosed(push);
    expect(push.code).toBe("CONSENT_UNKNOWN");
    expect(push.pushPermission).toBe("UNKNOWN");
    expect(push.smsPermission).toBe("WITHDRAWN");
    expect(push.emailPermission).toBe("UNKNOWN");

    withdraw("cust-m26-push", "push");
    const email = crm.markCartRecovered("cust-m26-push", abandoned({
      idempotencyKey: "m26-push-for-email",
      customerId: "cust-m26-push",
      cartCustomerId: "cust-m26-push",
      cartId: "cart-m26-email",
      channel: "email",
      pushPermission: "GRANTED",
    }));
    expectClosed(email);
    expect(email.code).toBe("CONSENT_UNKNOWN");
    expect(email.emailPermission).toBe("UNKNOWN");
    expect(email.pushPermission).toBe("WITHDRAWN");
    expect(email.smsPermission).toBe("UNKNOWN");
  });

  it("keeps unknown, blocked, timeout, and withdrawn recovery closed", () => {
    const unknown = crm.markCartRecovered("cust-m26-unknown", abandoned({
      idempotencyKey: "m26-unknown",
      customerId: "cust-m26-unknown",
      cartCustomerId: "cust-m26-unknown",
      cartId: "cart-m26-unknown",
    }));
    expectClosed(unknown);
    expect(unknown.code).toBe("CONSENT_UNKNOWN");
    expect(unknown.status).toBe("UNKNOWN");

    const blocked = crm.markCartRecovered("cust-m26-blocked", abandoned({
      idempotencyKey: "m26-blocked",
      customerId: "cust-m26-blocked",
      cartCustomerId: "cust-m26-blocked",
      cartId: "cart-m26-blocked",
      cartStatus: "deleted",
    }));
    expectClosed(blocked);
    expect(blocked.code).toBe("CART_DELETED");
    expect(blocked.status).toBe("BLOCKED");

    const timedOut = crm.markCartRecovered("cust-m26-timeout", abandoned({
      idempotencyKey: "m26-timeout",
      customerId: "cust-m26-timeout",
      cartCustomerId: "cust-m26-timeout",
      cartId: "cart-m26-timeout",
      timeout: true,
    }));
    expectClosed(timedOut);
    expect(timedOut.code).toBe("TIMEOUT");
    expect(timedOut.status).toBe("FAILED");

    const withdrawn = crm.markCartRecovered("cust-m26-email", abandoned({
      idempotencyKey: "m26-withdrawn-email",
      customerId: "cust-m26-email",
      cartCustomerId: "cust-m26-email",
      cartId: "cart-m26-withdrawn",
      channel: "email",
    }));
    expectClosed(withdrawn);
    expect(withdrawn.code).toBe("CONSENT_WITHDRAWN");
    expect(withdrawn.status).toBe("BLOCKED");
    expect(withdrawn.marketingPermission).toBe("WITHDRAWN");
    expect(withdrawn.smsPermission).toBe("UNKNOWN");
    expect(withdrawn.pushPermission).toBe("UNKNOWN");
  });
});
