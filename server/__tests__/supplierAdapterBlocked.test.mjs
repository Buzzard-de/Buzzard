import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { BaseSupplierAdapter } = require("../lib/supplier/baseAdapter.js");
const { MockSupplierAdapter } = require("../lib/supplier/mockAdapter.js");
const { getAdapter } = require("../lib/supplier/adapterRegistry.js");
const { evaluateOffer } = require("../lib/commerce/pricingPolicy.js");
const { inspectFeeds } = require("../lib/buzzardNative/core/specialists/stockEngine.js");
const { dispatch } = require("../lib/buzzardNative/core/specialistDispatch.js");

function expectClosed(result) {
  expect(result.ok).toBe(false);
  expect(result.live).toBe(false);
  expect(result.purchased).toBe(false);
  expect(result.price).toBeNull();
  expect(result.stock).toBeNull();
  expect(result.supplierCost).toBeNull();
  expect(result.commercialEligibility).toBe("BLOCKED");
}

describe("supplier adapters stay blocked without a live account", () => {
  it("does not treat a missing account or a stored key as a connection", async () => {
    const adapter = new BaseSupplierAdapter({ id: "wholesaler", name: "Wholesaler" });
    const missing = await adapter.authenticate();
    expect(missing.code).toBe("MISSING_CREDENTIALS");
    expect(missing.status).toBe("BLOCKED_EXTERNAL");
    expectClosed(missing);

    const previous = process.env.SUPPLIER_API_KEY;
    process.env.SUPPLIER_API_KEY = "present-not-a-connection";
    try {
      const keyed = await adapter.healthCheck();
      expect(keyed.code).toBe("CREDENTIALS_NOT_A_CONNECTION");
      expect(keyed.live).toBe(false);
      expect(JSON.stringify(keyed)).not.toContain("present-not-a-connection");
      expectClosed(keyed);
    } finally {
      if (previous == null) delete process.env.SUPPLIER_API_KEY;
      else process.env.SUPPLIER_API_KEY = previous;
    }
  });

  it("keeps the mock adapter out of commercial stock and price", async () => {
    const mock = new MockSupplierAdapter();
    const products = await mock.fetchProducts();
    const prices = await mock.fetchPrices();
    expect(products.mock).toBe(true);
    expect(products.live).toBe(false);
    expect(products.code).toBe("MOCK_NOT_COMMERCIAL");
    expect(products.records[0].price).toBeNull();
    expect(products.records[0].stock).toBeNull();
    expect(prices.price).toBeNull();
    expectClosed(products);
    expectClosed(prices);
  });

  it("rejects an unknown supplier, an invalid product, and unusable stock", async () => {
    const unknown = await getAdapter("not-a-supplier").fetchProducts();
    expect(unknown.code).toBe("SUPPLIER_UNKNOWN");
    expect(unknown.status).toBe("SUPPLIER_UNKNOWN");
    expectClosed(unknown);

    const mock = new MockSupplierAdapter();
    expect(mock.normalizeProduct({}).code).toBe("INVALID_PRODUCT");
    const missing = await mock.fetchStock({ sku: "MOCK-001" });
    expect(missing.code).toBe("MISSING_STOCK");
    const stale = await mock.fetchStock({ sku: "MOCK-001", stock: 4, updatedAt: Date.now() - 48 * 60 * 60 * 1000 });
    expect(stale.code).toBe("STALE_STOCK");
    expect(stale.stock).toBeNull();
    expectClosed(missing);
    expectClosed(stale);
  });

  it("reports timeout, network error, and a repeated request separately", async () => {
    const adapter = new BaseSupplierAdapter({ id: "wholesaler", name: "Wholesaler" });
    expect((await adapter.fetchProducts({ timeout: true })).code).toBe("TIMEOUT");
    expect((await adapter.fetchProducts({ timeout: true })).status).toBe("TIMEOUT");
    expect((await adapter.fetchProducts({ networkError: true })).code).toBe("NETWORK_ERROR");
    expect((await adapter.fetchProducts({ networkError: true })).status).toBe("NETWORK_ERROR");
    const first = await adapter.authenticate({ requestId: "same-request" });
    const second = await adapter.authenticate({ requestId: "same-request" });
    expect(first.ok).toBe(false);
    expect(second.code).toBe("DUPLICATE_REQUEST");
    expect(second.purchased).toBe(false);
  });

  it("blocks a purchase and a supplier choice without a verified order", async () => {
    const purchase = await new MockSupplierAdapter().submitOrder({ actorId: "stock_ai", humanApproved: true, customerOrderVerified: false });
    expect(purchase.code).toBe("PURCHASE_BLOCKED");
    expectClosed(purchase);
    const attempt = dispatch({ agentId: "stock_ai", kind: "STOCK_BUY", input: { humanApproved: true } });
    expect(attempt.ok).toBe(false);
    expect(attempt.result.purchased).toBe(false);

    const choice = inspectFeeds({
      feeds: [{ supplier: "mock", sku: "MOCK-001", qty: 42, updatedAt: Date.now(), mock: true }],
    });
    expect(choice.chosen).toBeNull();
    expect(choice.sellable).toBe(false);
    expect(choice.code).toBe("ORDER_UNVERIFIED");
    const verifiedOrder = inspectFeeds({
      customerOrderVerified: true,
      feeds: [{ supplier: "mock", sku: "MOCK-001", qty: 42, updatedAt: Date.now(), mock: true }],
    });
    expect(verifiedOrder.chosen).toBeNull();
    expect(verifiedOrder.code).toBe("LIVE_CONNECTION_ABSENT");
  });

  it("keeps an unverified supplier cost unknown in the pricing policy", () => {
    const priced = evaluateOffer({
      offerPrice: 40,
      supplierCost: 19.99,
      shippingCost: 2,
      marketplaceFee: 1,
      paymentFee: 1,
      returnReserve: 1,
      currency: "EUR",
      fx: 1,
      mock: true,
    });
    expect(priced.ok).toBe(false);
    expect(priced.status).toBe("UNKNOWN");
    expect(priced.commercialEligibility).toBe("BLOCKED");
    expect(priced.code).toBe("SUPPLIER_COST_UNVERIFIED");
    expect(priced.supplierCost).toBeNull();
    expect(priced.cost).toBeNull();
  });
});
