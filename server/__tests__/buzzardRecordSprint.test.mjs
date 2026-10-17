import { describe, it, expect, afterEach } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

describe("Buzzard record sprint — local supplier, shipping, listing honesty", () => {
  const prevDhl = process.env.DHL_API_KEY;

  afterEach(() => {
    if (prevDhl === undefined) delete process.env.DHL_API_KEY;
    else process.env.DHL_API_KEY = prevDhl;
  });

  it("supplier outage and missing timestamps are not stock", () => {
    const software = require("../lib/software");
    const outage = software.supplierFeeds.classifyOutage({ timeout: true });
    expect(outage.treatAsStock).toBe(false);
    expect(outage.availability).toBe("OUTAGE");
    const unknown = software.supplierFeeds.classifyAvailability({ sku: "A", stock: null });
    expect(unknown.purchasable).toBe(false);
    expect(unknown.treatAsStock).toBe(false);
    const stale = software.supplierFeeds.classifyAvailability({
      sku: "B",
      stock: 12,
      timestamp: "2019-01-01T00:00:00Z",
    });
    expect(stale.availability).toBe("STALE");
    expect(stale.purchasable).toBe(false);
    const reserved = software.inventory.reserve(require("../lib/db").db, {
      sku: "A",
      quantity: 12,
      requestQuantity: 1,
      availability: outage,
    });
    expect(reserved.reserved).toBe(false);
    expect(reserved.failClosed).toBe(true);
  });

  it("carrier API key does not enable live shipping rates or FX", () => {
    process.env.DHL_API_KEY = "not-a-real-key";
    const shipping = require("../lib/commerce/shippingProvider");
    const quote = shipping.calculateShipping({
      methodId: "standard",
      country: "DE",
      liveRate: true,
    });
    expect(quote.liveRate).toBe(false);
    expect(quote.source).toBe("local_table");
    expect(quote.shipmentCreated).toBe(false);
    const fx = shipping.calculateShipping({ currency: "USD" });
    expect(fx.ok).toBe(false);
    expect(fx.inventedFx).toBe(false);
    expect(fx.liveRate).toBe(false);
  });

  it("marketplace category map does not invent vendor IDs or publish", () => {
    const software = require("../lib/software");
    const mapped = software.marketplace.mapCategory({
      channel: "amazon",
      sourceCategory: "bremsen",
    });
    expect(mapped.mapped).toBe(false);
    expect(mapped.invented).toBe(false);
    expect(mapped.marketplaceCategoryId).toBeNull();
    expect(mapped.published).toBe(false);
    const transformed = software.marketplace.transformListing({
      channel: "amazon",
      sku: "BR-1",
      price: 19.9,
      category: "bremsen",
    });
    expect(transformed.published).toBe(false);
    expect(transformed.categoryMap.invented).toBe(false);
    expect(software.marketplace.publishListing({ channel: "amazon", sku: "BR-1", price: 19.9 }).reason).toBe(
      "PUBLISH_BLOCKED"
    );
  });

  it("return reconciliation does not auto-match refund to supplier credit", () => {
    const software = require("../lib/software");
    const db = require("../lib/db").db;
    software.initialize(db);
    const opened = software.returns.openCase(db, {
      orderNumber: `REC-${Date.now()}`,
      reason: "damaged",
      refundAmount: 12,
    });
    expect(opened.ok).toBe(true);
    const reconciled = software.returns.reconcileFinancials(db, opened.id);
    expect(reconciled.matched).toBe(false);
    expect(reconciled.executed).toBe(false);
    expect(reconciled.live).toBe(false);
  });
});
