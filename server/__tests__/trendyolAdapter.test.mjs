import { randomBytes } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { createTrendyolAdapter } = require("../lib/marketplace/trendyol/adapter");
const { HOSTS } = require("../lib/marketplace/trendyol/contract");

const ENV_KEYS = [
  "TRENDYOL_ENV",
  "TRENDYOL_SELLER_ID",
  "TRENDYOL_API_KEY",
  "TRENDYOL_API_SECRET",
  "TRENDYOL_STORE_FRONT_CODE",
  "TRENDYOL_ENABLED",
  "TRENDYOL_BASE_URL",
  "TRENDYOL_INTEGRATOR_NAME",
];

function saveEnv() {
  return Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
}

function restoreEnv(saved) {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
}

function useEnv(values) {
  for (const key of ENV_KEYS) delete process.env[key];
  Object.assign(process.env, values);
}

function credentials() {
  return {
    TRENDYOL_SELLER_ID: "2738",
    TRENDYOL_API_KEY: randomBytes(12).toString("hex"),
    TRENDYOL_API_SECRET: randomBytes(12).toString("hex"),
    TRENDYOL_ENABLED: "1",
    TRENDYOL_ENV: "stage",
    TRENDYOL_STORE_FRONT_CODE: "DE",
  };
}

function product(overrides = {}) {
  return {
    sku: "BZ-1",
    barcode: "4006381333931",
    title: "Brake disc",
    description: "Front disc",
    productMainId: "BZ-1",
    brandId: 10,
    categoryId: 20,
    quantity: 4,
    listPrice: 30,
    salePrice: 25,
    vatRate: 19,
    images: ["https://cdn.example.test/disc.jpg"],
    attributes: [{ attributeId: 1, attributeValueId: 2 }],
    ...overrides,
  };
}

function costs() {
  return {
    supplierCost: 10,
    shipping: 1,
    marketplaceCommission: 1,
    vat: 1,
    returnReserve: 0.2,
    paymentFees: 0.3,
  };
}

describe("trendyol international adapter", () => {
  let saved;
  afterEach(() => restoreEnv(saved));

  it("fails closed without credentials and does not call transport", async () => {
    saved = saveEnv();
    useEnv({});
    let calls = 0;
    const adapter = createTrendyolAdapter({ transport: async () => { calls += 1; return { status: 200, body: {} }; } });
    const health = adapter.health();
    expect(health.configured).toBe(false);
    expect(health.apiKey).toBe("missing");
    expect(health.apiSecret).toBe("missing");
    expect(health.live).toBe(false);
    const result = await adapter.createProducts([product()]);
    expect(result.ok).toBe(false);
    expect(result.code).toBe("SELLER_ID_MISSING");
    expect(calls).toBe(0);
  });

  it("rejects a seller id that is not a positive integer", async () => {
    saved = saveEnv();
    useEnv({ ...credentials(), TRENDYOL_SELLER_ID: "ABC" });
    const adapter = createTrendyolAdapter();
    expect(adapter.health().issues).toContain("SELLER_ID_INVALID");
    expect(adapter.health().configured).toBe(false);
  });

  it("selects the international stage host and the Germany storefront", () => {
    saved = saveEnv();
    useEnv(credentials());
    const health = createTrendyolAdapter().health();
    expect(health.market).toBe("international");
    expect(health.region).toBe("Europe");
    expect(health.storeFrontCode).toBe("DE");
    expect(health.baseUrl).toBe(HOSTS.stage);
    expect(health.userAgent).toBe("2738 - SelfIntegration");
    expect(health.productionReady).toBe(false);
    useEnv({ ...credentials(), TRENDYOL_ENV: "production" });
    expect(createTrendyolAdapter().health().baseUrl).toBe(HOSTS.production);
    useEnv({ ...credentials(), TRENDYOL_STORE_FRONT_CODE: "TR" });
    expect(createTrendyolAdapter().health().issues).toContain("DOMESTIC_MARKET_REJECTED");
  });

  it("maps a product onto Product V2 and keeps secrets out of the log", async () => {
    saved = saveEnv();
    const creds = credentials();
    useEnv(creds);
    const seen = [];
    const adapter = createTrendyolAdapter({
      transport: async (request) => {
        seen.push(request);
        return { status: 200, body: { batchRequestId: "batch-1" } };
      },
    });
    const result = await adapter.createProducts([product()]);
    expect(result.ok).toBe(true);
    expect(result.version).toBe("v2");
    expect(seen[0].path).toBe("/integration/product/sellers/2738/v2/products");
    expect(seen[0].url.startsWith(HOSTS.stage)).toBe(true);
    expect(seen[0].headers.storeFrontCode).toBe("DE");
    expect(seen[0].headers["User-Agent"]).toBe("2738 - SelfIntegration");
    expect(seen[0].headers.Authorization.startsWith("Basic ")).toBe(true);
    expect(seen[0].body.items[0].barcode).toBe("4006381333931");
    expect(seen[0].body.items[0].vatRate).toBe(19);
    const logged = JSON.stringify(adapter.logs());
    expect(logged).not.toContain(creds.TRENDYOL_API_SECRET);
    expect(logged).not.toContain(creds.TRENDYOL_API_KEY);
  });

  it("rejects a domestic VAT rate on the Germany storefront", async () => {
    saved = saveEnv();
    useEnv(credentials());
    let calls = 0;
    const adapter = createTrendyolAdapter({ transport: async () => { calls += 1; return { status: 200, body: {} }; } });
    const result = await adapter.createProducts([product({ vatRate: 20 })]);
    expect(result.code).toBe("PRODUCT_MAPPING_FAILED");
    expect(result.failures[0].code).toBe("VAT_RATE_INVALID");
    expect(calls).toBe(0);
  });

  it("builds a price and stock payload from the existing engines and blocks a stale quantity", async () => {
    saved = saveEnv();
    useEnv(credentials());
    const seen = [];
    const adapter = createTrendyolAdapter({
      transport: async (request) => {
        seen.push(request);
        return { status: 200, body: { batchRequestId: "batch-price" } };
      },
    });
    const fresh = await adapter.updatePriceAndStock([{
      barcode: "4006381333931",
      sku: "BZ-1",
      quantity: 4,
      updatedAt: Date.now(),
      costs: costs(),
    }]);
    expect(fresh.ok).toBe(true);
    expect(seen[0].path).toBe("/integration/inventory/sellers/2738/products/price-and-inventory");
    expect(seen[0].body.items[0].quantity).toBe(4);
    expect(seen[0].body.items[0].listPrice).toBeGreaterThanOrEqual(seen[0].body.items[0].salePrice);
    const stale = await adapter.updatePriceAndStock([{
      barcode: "4006381333931",
      sku: "BZ-1",
      quantity: 4,
      updatedAt: Date.now() - 25 * 60 * 60 * 1000,
      costs: costs(),
    }]);
    expect(stale.code).toBe("PRICE_STOCK_REJECTED");
    expect(stale.failures[0].code).toBe("STALE_STOCK");
    expect(seen).toHaveLength(1);
  });

  it("maps an order package and rejects the same package id", () => {
    saved = saveEnv();
    useEnv(credentials());
    const adapter = createTrendyolAdapter();
    const pkg = {
      shipmentPackageId: 3330111111,
      orderNumber: "TY-100",
      shipmentPackageStatus: "Created",
      currencyCode: "EUR",
      lines: [{ lineId: 5, barcode: "4006381333931", stockCode: "BZ-1", quantity: 1, lineUnitPrice: 25, currencyCode: "EUR" }],
    };
    const first = adapter.ingestPackage(pkg);
    expect(first.ok).toBe(true);
    expect(first.buzzardStatus).toBe("PENDING");
    expect(first.orderCreated).toBe(false);
    expect(first.persisted).toBe(false);
    const second = adapter.ingestPackage(pkg);
    expect(second.code).toBe("DUPLICATE_ORDER");
    expect(second.orderCreated).toBe(false);
  });

  it("retries upstream 503 and does not retry 401", async () => {
    saved = saveEnv();
    useEnv(credentials());
    let failures = 0;
    const retried = createTrendyolAdapter({
      sleep: async () => {},
      transport: async () => {
        failures += 1;
        if (failures < 3) return { status: 503, body: {} };
        return { status: 200, body: { batchRequestId: "batch-retry" } };
      },
    });
    const ok = await retried.createProducts([product()]);
    expect(ok.ok).toBe(true);
    expect(ok.attempts).toBe(3);
    let authCalls = 0;
    const denied = createTrendyolAdapter({
      transport: async () => {
        authCalls += 1;
        return { status: 401, body: { exception: "ClientApiAuthenticationException" } };
      },
    });
    const auth = await denied.createProducts([product({ barcode: "4006381333932", sku: "BZ-2", productMainId: "BZ-2" })]);
    expect(auth.code).toBe("AUTHENTICATION_FAILED");
    expect(authCalls).toBe(1);
  });

  it("stops at the local rate limit", async () => {
    saved = saveEnv();
    useEnv(credentials());
    let calls = 0;
    const adapter = createTrendyolAdapter({
      limits: { productWritePerMinute: 1 },
      transport: async () => {
        calls += 1;
        return { status: 200, body: { batchRequestId: `b-${calls}` } };
      },
    });
    const first = await adapter.createProducts([product()]);
    const second = await adapter.createProducts([product({ barcode: "4006381333932", sku: "BZ-2", productMainId: "BZ-2" })]);
    expect(first.ok).toBe(true);
    expect(second.code).toBe("RATE_LIMITED");
    expect(calls).toBe(1);
  });

  it("blocks tracking until the package is Picking and does not register a webhook", async () => {
    saved = saveEnv();
    useEnv(credentials());
    const adapter = createTrendyolAdapter({ transport: async () => ({ status: 200, body: {} }) });
    const early = await adapter.updateTracking({ packageId: 10, packageStatus: "Created", carrierId: "DHL", cargoSenderNumber: "123" });
    expect(early.code).toBe("TRACKING_STATUS_BLOCKED");
    const ready = await adapter.updateTracking({ packageId: 10, packageStatus: "Picking", carrierId: "DHL", cargoSenderNumber: "123" });
    expect(ready.ok).toBe(true);
    const claim = adapter.ingestClaim({ claimId: "claim-1", orderNumber: "TY-100", orderShipmentPackageId: 10 });
    expect(claim.ok).toBe(true);
    expect(claim.return.live).toBe(false);
    expect(claim.return.labelIssued).toBe(false);
    expect(adapter.registerWebhook().code).toBe("WEBHOOK_REGISTRATION_BLOCKED");
    const cancelled = await adapter.cancelItems({ packageId: 10, lines: [{ lineId: 5, quantity: 1 }], reasonId: 500 });
    expect(cancelled.ok).toBe(true);
    const invoice = await adapter.sendInvoiceLink({ shipmentPackageId: 10, invoiceLink: "https://invoice.example.test/a.pdf" });
    expect(invoice.ok).toBe(true);
  });

  it("does not send the same product batch twice", async () => {
    saved = saveEnv();
    useEnv(credentials());
    let calls = 0;
    const adapter = createTrendyolAdapter({
      transport: async () => {
        calls += 1;
        return { status: 200, body: { batchRequestId: "batch-once" } };
      },
    });
    const first = await adapter.createProducts([product()]);
    const second = await adapter.createProducts([product()]);
    expect(first.ok).toBe(true);
    expect(second.duplicate).toBe(true);
    expect(calls).toBe(1);
  });
});
