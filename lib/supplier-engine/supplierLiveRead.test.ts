import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  B2bSandboxSupplierConnector,
  MockSupplierTransport,
  buildDataQualityReport,
  evaluateLiveReadSyncGuard,
  hasLiveSupplierCredentialsConfigured,
  liveProfileToSupplierConfig,
  normalizeB2bSandboxRecord,
  parseSafeXmlProducts,
  parseSupplierFeedBody,
  redactSecrets,
  runSupplierDryRunTestSync,
  runSupplierLiveReadSync,
  validateSupplierEndpoint,
  getSupplierOrThrow,
} from "./index";
import type { LiveSupplierProfile } from "./liveSupplier/types";
import { resetSupplierEngineForTests } from "./testReset";

const MOCK_BASE = "https://supplier-sandbox.example";

function buildTestProfile(overrides: Partial<LiveSupplierProfile> = {}): LiveSupplierProfile {
  return {
    supplierId: "LIVE_SUPPLIER_TEST",
    name: "Live Supplier Test",
    country: "DE",
    region: "EU",
    currency: "EUR",
    connectorType: "b2b-sandbox",
    environment: "SANDBOX",
    baseUrl: MOCK_BASE,
    secretsRef: "env:SUPPLIER_LIVE_TEST_CREDENTIALS",
    authentication: "api_key",
    endpoints: {
      health: "/health",
      products: "/products",
      stock: "/stock",
      prices: "/prices",
    },
    fieldMapping: {
      article_number: "supplierSku",
      ean_code: "ean",
      price_net: "supplierPrice",
      stock_qty: "stock",
      title: "name",
      brand_name: "brand",
    },
    supportedMarkets: ["DE"],
    feedFormat: "json",
    capabilities: {
      productFeed: true,
      stockFeed: true,
      priceFeed: true,
      orderAPI: false,
      createOrder: false,
    },
    ...overrides,
  };
}

describe("B2B Sandbox Adapter — security", () => {
  it("blocks SSRF targets", () => {
    expect(validateSupplierEndpoint("http://127.0.0.1/products").allowed).toBe(false);
    expect(validateSupplierEndpoint("http://169.254.169.254/meta").allowed).toBe(false);
  });

  it("blocks XXE payloads", () => {
    const xml = '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><products></products>';
    expect(() => parseSafeXmlProducts(xml)).toThrow("XXE_BLOCKED");
  });

  it("redacts secrets in logs", () => {
    const redacted = redactSecrets({ apiKey: "secret", username: "user" });
    expect(JSON.stringify(redacted)).not.toContain("secret");
  });
});

describe("B2B Sandbox Adapter — mapping", () => {
  it("maps supplier fields without inventing identifiers", () => {
    const profile = buildTestProfile();
    const mapped = normalizeB2bSandboxRecord(
      {
        article_number: "SKU-100",
        title: "Brake Pad",
        price_net: 12.5,
        stock_qty: 4,
      },
      profile
    );
    expect(mapped.supplierSku).toBe("SKU-100");
    expect(mapped.brand).toBeUndefined();
    expect(mapped.ean).toBeUndefined();
    expect(mapped.buzzardCategory).toBe("REVIEW_REQUIRED");
  });

  it("builds data quality report", () => {
    const report = buildDataQualityReport(
      [
        { supplierSku: "A1", buzzardCategory: "REVIEW_REQUIRED" },
        { supplierSku: "A2", ean: "4006633001247", brand: "Bosch", supplierPrice: 10, stock: 1, images: ["https://cdn.example/img.jpg"] },
      ],
      { automotive: true }
    );
    expect(report.totalProducts).toBe(2);
    expect(report.missingEan).toBe(1);
    expect(report.reviewRequiredCategories).toBe(1);
  });
});

describe("B2B Sandbox Adapter — mock transport", () => {
  const originalNetwork = process.env.SUPPLIER_NETWORK_ENABLED;

  beforeEach(() => {
    resetSupplierEngineForTests();
    process.env.SUPPLIER_NETWORK_ENABLED = "1";
    process.env.SUPPLIER_LIVE_TEST_CREDENTIALS = JSON.stringify({ apiKey: "test-key" });
  });

  afterEach(() => {
    process.env.SUPPLIER_NETWORK_ENABLED = originalNetwork;
    delete process.env.SUPPLIER_LIVE_TEST_CREDENTIALS;
  });

  it("fetches products via mock transport", async () => {
    const profile = buildTestProfile();
    const supplier = liveProfileToSupplierConfig(profile);
    const productPayload = JSON.stringify({
      products: [
        {
          article_number: "LIVE-1",
          ean_code: "4006633001247",
          brand_name: "ATE",
          title: "Brake Disc",
          price_net: 21.5,
          stock_qty: 12,
        },
      ],
    });
    const transport = new MockSupplierTransport({
      [`GET ${MOCK_BASE}/products`]: { status: 200, body: productPayload },
      [`GET ${MOCK_BASE}/products?limit=50`]: { status: 200, body: productPayload },
      [`GET ${MOCK_BASE}/health`]: { status: 200, body: '{"status":"ok"}' },
    });

    const connector = new B2bSandboxSupplierConnector(supplier, {}, { transport });
    const connect = await connector.connect();
    expect(connect.ok).toBe(true);

    const products = await connector.fetchProducts({ limit: 50 });
    expect(products.ok).toBe(true);
    expect(products.records.length).toBe(1);
    expect(products.records[0].supplierSku).toBe("LIVE-1");
  });

  it("handles auth failure without fake success", async () => {
    const profile = buildTestProfile();
    const supplier = liveProfileToSupplierConfig(profile);
    const transport = new MockSupplierTransport({
      [`GET ${MOCK_BASE}/health`]: { status: 401, body: '{"error":"unauthorized"}' },
    });
    const connector = new B2bSandboxSupplierConnector(supplier, {}, { transport });
    const health = await connector.healthCheck();
    expect(["UNHEALTHY", "DEGRADED"]).toContain(health.status);
    expect(health.status).not.toBe("HEALTHY");
  });
});

describe("B2B Sandbox Adapter — live read guard", () => {
  beforeEach(() => resetSupplierEngineForTests());

  it("blocks live read when disabled", () => {
    process.env.SUPPLIER_LIVE_READ_ENABLED = "0";
    process.env.SUPPLIER_NETWORK_ENABLED = "0";
    const guard = evaluateLiveReadSyncGuard("LIVE_SUPPLIER_TEST");
    expect(guard.allowed).toBe(false);
    expect(guard.reasons).toContain("LIVE_READ_DISABLED");
  });

  it("reports missing credentials without passing fake success", () => {
    expect(hasLiveSupplierCredentialsConfigured()).toBe(false);
  });
});

describe("B2B Sandbox Adapter — XML feed", () => {
  it("parses XML products safely", () => {
    const xml = `<?xml version="1.0"?><catalog><product><article_number>X1</article_number><price_net>9.99</price_net></product></catalog>`;
    const parsed = parseSupplierFeedBody(xml, "xml");
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.records[0].article_number).toBe("X1");
  });

  it("parses malformed JSON safely", () => {
    const parsed = parseSupplierFeedBody("{bad", "json");
    expect(parsed.ok).toBe(false);
  });
});

describe("B2B Sandbox Adapter — dry-run sync", () => {
  it("does not claim live success when network disabled", async () => {
    process.env.SUPPLIER_LIVE_SUPPLIER_ID = "LIVE_SUPPLIER_TEST";
    process.env.SUPPLIER_LIVE_BASE_URL = MOCK_BASE;
    process.env.SUPPLIER_NETWORK_ENABLED = "0";
    resetSupplierEngineForTests();
    getSupplierOrThrow("LIVE_SUPPLIER_TEST");

    const result = await runSupplierDryRunTestSync("LIVE_SUPPLIER_TEST", { integrationType: "b2b-sandbox" });
    expect(result.dryRun).toBe(true);
    expect(result.source).toBe("mock");
    expect(result.warnings.some((w) => w.includes("network disabled"))).toBe(true);

    delete process.env.SUPPLIER_LIVE_SUPPLIER_ID;
    delete process.env.SUPPLIER_LIVE_BASE_URL;
  });
});

describe("B2B Sandbox Adapter — live read sync blocked", () => {
  it("returns guard reasons instead of writing data", async () => {
    resetSupplierEngineForTests();
    process.env.SUPPLIER_LIVE_READ_ENABLED = "0";
    const result = await runSupplierLiveReadSync("UNKNOWN_SUPPLIER");
    expect(result.liveRead).toBe(true);
    expect(result.status).toBe("FAILED");
    expect(result.guardReasons?.length).toBeGreaterThan(0);
  });
});
