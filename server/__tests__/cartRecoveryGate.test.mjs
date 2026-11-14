import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const crm = require("../lib/crmLoyalty.js");
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
    expect(first.code).toBe("SALES_CLOSED");
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
    expect(first.marketingPermission).toBe("BLOCKED");
    expect(first.callerFlagIgnored).toBe(true);
    expect(first.reasons).toEqual(expect.arrayContaining(["SALES_CLOSED", "ORDER_UNVERIFIED", "PAYMENT_UNVERIFIED"]));
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
    expect(missing.marketingPermission).toBe("BLOCKED");
    expect(missing.notificationSent).toBe(false);
    expect(withdrawn.marketingPermission).toBe("WITHDRAWN");
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
