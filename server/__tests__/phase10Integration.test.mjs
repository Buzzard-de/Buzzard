import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { createConnector } = require("../lib/marketplace/marketplaceConnectorRegistry.js");
const { runPhase10Evidence } = require("../lib/marketplace/phase10Evidence.js");
const { evaluatePhase10Marketplace } = require("../lib/platform/phase10Marketplace.js");

const LISTING = {
  sku: "PHASE10-SYN-001",
  title: "Synthetic brake pad",
  gtin: "5901234123457",
  mpn: "P85073",
  image_link: "https://cdn.test-supplier.example.de/p85073.jpg",
};

describe("phase 10 marketplace integration", () => {
  it("records registry, listing, price, stock, order, locale, and credential outputs", () => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    const evidence = runPhase10Evidence();
    expect(evidence.code).not.toBe("REFUSED_PRODUCTION_DB");
    expect(evidence.registry.count).toBe(10);
    expect(evidence.account.unknownCode).toBe("CHANNEL_UNKNOWN");
    expect(evidence.listing.invalidAccepted).toBe(false);
    expect(evidence.listing.mappedSku).toBe("AMZ-PHASE10-SYN-001");
    expect(evidence.price.amazonFee).not.toBe(evidence.price.ebayFee);
    expect(evidence.price.deRate).not.toBe(evidence.price.frRate);
    expect(evidence.price.unknownVat).toBe("VAT_UNKNOWN");
    expect(evidence.stock.availableStock).toBe(3);
    expect(evidence.orders.count).toBe(1);
    expect(evidence.retry.attempts).toBe(2);
    expect(evidence.locale.deCountry).toBe("DE");
    expect(evidence.locale.frCountry).toBe("FR");
    expect(evidence.credentials.liveSuccess).toBe(false);
    expect(evidence.live).toBe(false);
    expect(evidence.productionReady).toBe(false);
    expect(evidence.ok).toBe(true);
  });

  it("uses the connector publish, stock, price, order, and return functions", async () => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    delete process.env.AMAZON_SP_API_CLIENT_ID;
    delete process.env.AMAZON_PUBLISH_ALLOWED;
    const amazon = createConnector("amazon");
    const invalid = await amazon.publishListing({ sku: "X", title: "Bad" });
    expect(invalid.ok).toBe(false);
    expect(invalid.live).toBe(false);
    expect(invalid.issues.length).toBeGreaterThan(0);
    const decided = amazon.publishDecision(LISTING);
    const published = await amazon.publishListing(LISTING);
    expect(published).toEqual(decided);
    expect(published.code).toBe("LIVE_CONNECTION_BLOCKED");
    const stock = await amazon.syncStock({ sku: LISTING.sku, stock: 4 });
    const price = await amazon.syncPrice({ sku: LISTING.sku, price: 49.5 });
    const orders = await amazon.importOrders({});
    const returns = await amazon.syncReturns({});
    expect(stock).toMatchObject({ ok: true, dryRun: true, live: false, updated: 0 });
    expect(price).toMatchObject({ ok: true, dryRun: true, live: false, updated: 0 });
    expect(orders).toMatchObject({ ok: true, dryRun: true, live: false, orders: [] });
    expect(returns).toMatchObject({ ok: true, dryRun: true, live: false, returns: [] });
    expect(createConnector("missing-channel")).toMatchObject({ ok: false, code: "CHANNEL_UNKNOWN" });
  });

  it("does not treat a blocked live publish as completion", () => {
    const report = evaluatePhase10Marketplace();
    expect(report.checks.find((check) => check.id === "MKT_REGISTRY").ok).toBe(true);
    expect(report.checks.find((check) => check.id === "MKT_CREDENTIALS").ok).toBe(true);
    expect(report.checks.find((check) => check.id === "MKT_LIVE_PUBLISH").status).toBe("BLOCKED_EXTERNAL");
    expect(report.completeClaim).toBe(false);
    expect(report.live).toBe(false);
  });
});
