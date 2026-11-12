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
    expect(created.code).toBe("SALES_CLOSED");
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
