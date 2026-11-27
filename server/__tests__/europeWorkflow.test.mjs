import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";
import { afterEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { CHANNELS } = require("../lib/marketplace/marketplaceConnectorRegistry");
const { preflight, prepareListing, routeOrder } = require("../lib/marketplace/europe/workflow");
const { buildLinks } = require("../lib/marketplace/europe/categoryInventory");
const { preflightListing } = require("../lib/marketplaceHub");

function costs() {
  return { supplierCost: 10, shipping: 1, marketplaceCommission: 1, vat: 1, returnReserve: 0.2, paymentFees: 0.3 };
}

function product(overrides = {}) {
  return {
    sku: "BZ-1",
    title: "Front disc",
    ean: "5901234123457",
    mpn: "P85073",
    imageLink: "https://cdn.test-supplier.example.de/p85073.jpg",
    category: "bz.01",
    stock: 4,
    supplier: "catalog",
    ...overrides,
  };
}

function ready(overrides = {}) {
  return {
    product: product(),
    platform: "MediaMarkt Marketplace",
    country: "DE",
    costs: costs(),
    quantity: 4,
    updatedAt: Date.now(),
    stateCode: "NEW",
    marketplaceCategoryId: "merchant-supplied",
    marketplaceAttributesConfirmed: true,
    ...overrides,
  };
}

describe("europe marketplace workflow", () => {
  const saved = { sales: process.env.BUZZARD_SALES_ENABLED };
  afterEach(() => {
    if (saved.sales == null) delete process.env.BUZZARD_SALES_ENABLED;
    else process.env.BUZZARD_SALES_ENABLED = saved.sales;
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("EUROPE_")) delete process.env[key];
    }
  });

  it("keeps the existing registry and blocks an unknown channel", () => {
    expect(CHANNELS).toHaveLength(11);
    process.env.BUZZARD_SALES_ENABLED = "0";
    const unknown = preflightListing({ marketplace: "unknown_channel_xyz", productSku: "A", title: "Test title" });
    expect(unknown).toMatchObject({ ok: false, code: "CHANNEL_UNKNOWN", live: false });
    const europe = preflightListing({ marketplace: "MediaMarkt Marketplace", productSku: "BZ-1", title: "Disc" });
    expect(europe.code).toBe("CATEGORY_NOT_FOUND");
    expect(europe.live).toBe(false);
    expect(europe.salesEnabled).toBe(false);
  });

  it("accepts every active Buzzard category and rejects a retired one", () => {
    const codes = buildLinks().codes;
    expect(codes).toHaveLength(50);
    for (const code of codes) {
      const plan = preflight({ marketplace: "Amazon", productSku: "BZ-1", title: "Item", buzzardCategory: code, country: "DE" });
      expect(plan).toMatchObject({ code: "BLOCKED_EXTERNAL_DEPENDENCY", reason: "MARKETPLACE_CATEGORY_UNMAPPED", publish: false, live: false });
    }
    const retired = preflight({ marketplace: "Amazon", buzzardCategory: "bz.20", country: "DE", productSku: "BZ-1", title: "Item" });
    expect(retired.code).toBe("CATEGORY_RETIRED");
  });

  it("routes a product through pricing, stock and the existing connector", async () => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    const missingPrice = await prepareListing(ready({ platform: "Amazon", costs: { supplierCost: 10 } }));
    expect(missingPrice).toMatchObject({ code: "PRICING_NOT_VERIFIED", live: false, publish: false, salesEnabled: false });
    const stale = await prepareListing(ready({ platform: "Amazon", updatedAt: Date.now() - 25 * 60 * 60 * 1000 }));
    expect(stale.code).toBe("STALE_STOCK");
    const amazon = await prepareListing(ready({ platform: "Amazon" }));
    expect(amazon).toMatchObject({ code: "LIVE_CONNECTION_BLOCKED", channel: "amazon", live: false, publish: false, network: false, productionReady: false });
    const orders = await routeOrder({ platform: "Amazon", country: "DE" });
    expect(orders).toMatchObject({ platformId: "amazon", dryRun: true, orders: [], live: false, orderCreated: false });
  });

  it("sends a prepared Europe offer only to an injected transport", async () => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    const blocked = await prepareListing(ready());
    expect(blocked).toMatchObject({ code: "BLOCKED_EXTERNAL_DEPENDENCY", reason: "CREDENTIALS_MISSING", publish: false, live: false });
    const apiKey = randomBytes(12).toString("hex");
    const env = {
      ...process.env,
      EUROPE_MEDIAMARKT_API_KEY: apiKey,
      EUROPE_MEDIAMARKT_BASE_URL: "https://merchant.example.test",
      EUROPE_MEDIAMARKT_ENABLED: "1",
    };
    let calls = 0;
    const closed = await prepareListing(ready({ env }));
    expect(closed.code).toBe("LIVE_PUBLISH_CLOSED");
    expect(calls).toBe(0);
    const sent = await prepareListing(ready({
      env,
      transport: async (request) => {
        calls += 1;
        expect(request.body.offers[0].shop_sku).toBe("BZ-1");
        expect(request.body.offers[0].quantity).toBe(4);
        return { status: 201, body: { import_id: 9 } };
      },
    }));
    expect(calls).toBe(1);
    expect(sent).toMatchObject({ ok: true, live: false, network: false, publish: false, productionReady: false, salesEnabled: false });
    expect(JSON.stringify(sent)).not.toContain(apiKey);
    const forced = await prepareListing(ready({
      env: { ...env, EUROPE_MARKETPLACE_LIVE: "1" },
      transport: async () => { calls += 1; return { status: 200, body: {} }; },
    }));
    expect(forced.code).toBe("LIVE_CALLS_FORBIDDEN");
    expect(calls).toBe(1);
  });

  it("returns closed channel types and routes an order without creating one", async () => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    const comparison = await prepareListing(ready({ platform: "Idealo", country: "DE" }));
    expect(comparison.code).toBe("COMPARISON_CHANNEL");
    const classified = await routeOrder({ platform: "Kleinanzeigen", country: "DE", order: { order_id: "K-1" } });
    expect(classified.code).toBe("CLASSIFIED_CHANNEL");
    const external = await prepareListing(ready({ platform: "Autodoc" }));
    expect(external).toMatchObject({ code: "BLOCKED_EXTERNAL_DEPENDENCY", reason: "API_NOT_VERIFIED" });
    const first = await routeOrder({ platform: "Conrad", country: "DE", order: { order_id: "C-77", order_state: "WAITING_ACCEPTANCE" } });
    expect(first).toMatchObject({ ok: true, platformId: "conrad", externalOrderId: "C-77", buzzardStatus: "PENDING", orderCreated: false, persisted: false, live: false });
    const second = await routeOrder({ platform: "Conrad", country: "DE", order: { order_id: "C-77" } });
    expect(second.code).toBe("DUPLICATE_ORDER");
    const trendyol = await routeOrder({ platform: "Trendyol" });
    expect(trendyol).toMatchObject({ platformId: "trendyol", adapterAttached: true, dryRun: true, orders: [], live: false, orderCreated: false, salesEnabled: false });
  });
});
