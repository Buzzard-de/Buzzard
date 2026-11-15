import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const marketing = require("../lib/marketingCenter.js");
const pricing = require("../lib/commerce/pricingPolicy.js");
const orders = require("../lib/orderManagement.js");
const { db } = require("../lib/db");

function counts() {
  return {
    campaigns: db.prepare("SELECT COUNT(*) n FROM marketing_campaigns").get().n,
    spend: db.prepare("SELECT COUNT(*) n FROM marketing_campaign_spend").get().n,
    conversions: db.prepare("SELECT COUNT(*) n FROM marketing_campaign_conversions").get().n,
    coupons: db.prepare("SELECT COUNT(*) n FROM coupons").get().n,
    orders: db.prepare("SELECT COUNT(*) n FROM commerce_orders").get().n,
    providers: db.prepare("SELECT COUNT(*) n FROM marketing_provider_connections WHERE enabled = 1").get().n,
  };
}

describe("marketing campaigns are not sales", () => {
  it("does not create, update, delete, publish, or spend a campaign", async () => {
    const before = counts();
    const created = marketing.createCampaign({
      name: "Spring Push",
      channel: "google",
      status: "active",
      budget: 500,
      couponCode: "WELCOME10",
      live: true,
      verified: true,
      approved: true,
      paid: true,
    });
    expect(created.ok).toBe(false);
    expect(created.code).toBe("CAMPAIGN_SOURCE_UNKNOWN");
    expect(created.status).toBe("UNKNOWN");
    expect(created.authorized).toBe(false);
    expect(created.created).toBe(false);
    expect(created.stored).toBe(false);
    expect(created.budget).toBeNull();
    expect(created.couponIssued).toBe(false);
    expect(created.published).toBe(false);
    expect(created.landingUrl).toBeNull();
    expect(created.callerFlagIgnored).toBe(true);

    const again = marketing.createCampaign({ name: "Spring Push", channel: "google", budget: 500 });
    expect(again.duplicate).toBe(true);
    expect(again.idempotent).toBe(true);
    const [left, right] = await Promise.all([
      Promise.resolve().then(() => marketing.createCampaign({ name: "Spring Push", paid: true })),
      Promise.resolve().then(() => marketing.createCampaign({ name: "Spring Push", successful: true })),
    ]);
    expect(left.created).toBe(false);
    expect(right.created).toBe(false);
    expect([left.duplicate, right.duplicate].filter(Boolean).length).toBe(2);

    const updated = marketing.updateCampaign(1, { status: "active", budget: 900, live: true });
    const deleted = marketing.deleteCampaign(1, { deleted: true, approved: true });
    expect(updated.updated).toBe(false);
    expect(updated.stored).toBe(false);
    expect(deleted.deleted).toBe(false);
    const provider = marketing.updateProvider("google_ads", { enabled: true, live: true, verified: true });
    expect(provider.live).toBe(false);
    expect(provider.enabled).toBe(false);
    expect(provider.stored).toBe(false);
    const spend = marketing.addCampaignSpend(1, { spend: 80, paid: true });
    expect(spend.stored).toBe(false);
    expect(spend.spend).toBeNull();
    const slug = marketing.getCampaignBySlug("missing-campaign");
    expect(slug.published).toBe(false);
    expect(slug.landingUrl).toBeNull();
    expect(slug.code).toBe("UNKNOWN");

    const fx = pricing.resolveFx({ currency: "EUR", fx: 1, fxVerified: true, live: true });
    expect(fx.ok).toBe(false);
    expect(fx.code).toBe("FX_UNVERIFIED");
    expect(fx.rate).toBeNull();
    expect(fx.source).toBe("UNKNOWN");

    expect(counts()).toEqual(before);
  });

  it("does not split an order, link a shipment, store a note, or report gross sales", () => {
    const user = db.prepare("INSERT INTO users(email, password_hash, role, name) VALUES(?,?,?,?)").run(
      `oms-${Date.now()}@example.test`,
      "x",
      "customer",
      "Oms"
    );
    const inserted = db.prepare(
      "INSERT INTO oms_orders(order_number, customer_id, order_status, grand_total) VALUES(?,?, 'pending', ?)"
    ).run(`BZ-NOTE-${Date.now()}`, user.lastInsertRowid, 80);
    const notesBefore = db.prepare("SELECT COUNT(*) n FROM oms_order_notes").get().n;
    const note = orders.addOrderNote(inserted.lastInsertRowid, { note: "buyer@example.test secret", internal: false });
    expect(note.ok).toBe(false);
    expect(note.noteSaved).toBe(false);
    expect(note.stored).toBe(false);
    expect(JSON.stringify(note)).not.toContain("buyer@example.test");
    expect(db.prepare("SELECT COUNT(*) n FROM oms_order_notes").get().n).toBe(notesBefore);
    const split = orders.splitOrder(inserted.lastInsertRowid, { paid: true, successful: true });
    expect(split.orderCreated).toBe(false);
    expect(split.childOrder).toBeNull();
    const link = orders.addFulfillmentLink(inserted.lastInsertRowid, { delivered: true, live: true });
    expect(link.linked).toBe(false);
    expect(link.shipmentCreated).toBe(false);
    const overview = orders.getOmsOverview();
    expect(overview.grossValue).toBeNull();
    expect(overview.revenue).toBeNull();
    expect(overview.salesRecorded).toBe(false);
  });
});

describe("FIN-M27 campaign creation stays closed", () => {
  function campaign(extra = {}) {
    return {
      name: "Closed Campaign",
      campaignId: "camp-m27",
      sourceRecordId: "rec-m27",
      authoritySource: "campaign-registry",
      ownerId: "owner-m27",
      country: "DE",
      campaignCountry: "DE",
      currency: "EUR",
      campaignCurrency: "EUR",
      productId: "prod-m27",
      campaignProductId: "prod-m27",
      category: "sensors",
      campaignCategory: "sensors",
      startsAt: "2020-06-01T00:00:00.000Z",
      endsAt: "2099-01-01T00:00:00.000Z",
      customerId: "cust-m27",
      ...extra,
    };
  }

  function expectClosed(result) {
    expect(result.ok).toBe(false);
    expect(result.authorized).toBe(false);
    expect(result.created).toBe(false);
    expect(result.stored).toBe(false);
    expect(result.published).toBe(false);
    expect(result.granted).toBe(false);
    expect(result.consentVerified).toBe(false);
    expect(result.budget).toBeNull();
    expect(result.spend).toBeNull();
    expect(result.discount).toBeNull();
    expect(result.commercialTotal).toBeNull();
    expect(result.orderCreated).toBe(false);
    expect(result.paymentCreated).toBe(false);
    expect(result.customerNotified).toBe(false);
    expect(result.messageSent).toBe(false);
    expect(result.emailSent).toBe(false);
    expect(result.smsSent).toBe(false);
    expect(result.pushSent).toBe(false);
    expect(result.status).not.toBe(200);
  }

  it("does not store a campaign for an unverified owner or an unknown source", () => {
    const owner = marketing.createCampaign(campaign({ idempotencyKey: "m27-owner" }));
    expectClosed(owner);
    expect(owner.code).toBe("CAMPAIGN_OWNER_UNVERIFIED");
    expect(owner.status).toBe("UNKNOWN");

    const source = marketing.createCampaign(campaign({
      idempotencyKey: "m27-source",
      authoritySource: "",
      sourceRecordId: "",
    }));
    expectClosed(source);
    expect(source.code).toBe("CAMPAIGN_SOURCE_UNKNOWN");
    expect(source.status).toBe("UNKNOWN");
  });

  it("keeps an unknown window and an unknown permission closed", () => {
    const window = marketing.createCampaign(campaign({
      idempotencyKey: "m27-window",
      startsAt: "",
      endsAt: "",
    }));
    expectClosed(window);
    expect(window.code).toBe("CAMPAIGN_WINDOW_UNKNOWN");
    expect(window.status).toBe("UNKNOWN");
    expect(window.emailPermission).toBe("UNKNOWN");
    expect(window.smsPermission).toBe("UNKNOWN");
    expect(window.pushPermission).toBe("UNKNOWN");
  });

  it("keeps a blocked campaign and a timeout closed", () => {
    const blocked = marketing.createCampaign(campaign({
      idempotencyKey: "m27-blocked",
      campaignStatus: "cancelled",
    }));
    expectClosed(blocked);
    expect(blocked.code).toBe("CAMPAIGN_CANCELLED");
    expect(blocked.status).toBe("BLOCKED");

    const timedOut = marketing.createCampaign(campaign({
      idempotencyKey: "m27-timeout",
      timeout: true,
      ok: true,
      status: 200,
      authorized: true,
      permission: true,
    }));
    expectClosed(timedOut);
    expect(timedOut.code).toBe("TIMEOUT");
    expect(timedOut.status).toBe("UNKNOWN");
    expect(timedOut.callerPermissionIgnored).toBe(true);

    const failed = marketing.createCampaign(campaign({
      idempotencyKey: "m27-failed",
      networkError: true,
    }));
    expectClosed(failed);
    expect(failed.code).toBe("NETWORK_ERROR");
    expect(failed.status).toBe("UNKNOWN");
  });

  it("does not let one channel permission authorize another channel or a campaign", () => {
    const email = marketing.createCampaign(campaign({
      idempotencyKey: "m27-email",
      channel: "email",
      permission: true,
      emailPermission: "GRANTED",
      ok: true,
      status: 200,
    }));
    expectClosed(email);
    expect(email.code).toBe("CAMPAIGN_OWNER_UNVERIFIED");
    expect(email.emailPermission).toBe("UNKNOWN");
    expect(email.smsPermission).toBe("UNKNOWN");
    expect(email.pushPermission).toBe("UNKNOWN");

    const sms = marketing.createCampaign(campaign({
      idempotencyKey: "m27-sms",
      channel: "sms",
      smsPermission: "GRANTED",
      permission: true,
    }));
    expectClosed(sms);
    expect(sms.smsPermission).toBe("UNKNOWN");
    expect(sms.emailPermission).toBe("UNKNOWN");
    expect(sms.pushPermission).toBe("UNKNOWN");

    const push = marketing.createCampaign(campaign({
      idempotencyKey: "m27-push",
      channel: "push",
      pushPermission: "GRANTED",
    }));
    expectClosed(push);
    expect(push.pushPermission).toBe("UNKNOWN");
    expect(push.emailPermission).toBe("UNKNOWN");
    expect(push.smsPermission).toBe("UNKNOWN");
    expect(push.messageSent).toBe(false);
  });
});
