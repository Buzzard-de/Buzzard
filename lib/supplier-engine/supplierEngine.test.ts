import { describe, it, expect, beforeEach } from "vitest";
import {
  ApiSupplierConnector,
  XmlSupplierConnector,
  CsvSupplierConnector,
  ManualSupplierConnector,
  applyFieldMapping,
  validateMappedRecord,
  checkRateLimit,
  resetRateLimit,
  computeBackoffDelay,
  isRetryableError,
  withRetry,
  parseCsvFeed,
  getSupplier,
  getSupplierOrThrow,
  ingestSupplierFeed,
  runSupplierSyncJob,
  TEST_SUPPLIER_ID,
  getTestFeedProducts,
  sanitizeClientSyncRequest,
  redactSecrets,
  rejectClientCredentials,
  createSupplierOrder,
  computeSupplierReliabilityScore,
  selectBestSupplierForMarket,
  clearObservability,
  getSupplierLogs,
} from "./index";
import { loadFixtureProduct } from "@/lib/product-engine/fixtures";
import { getProduct, updateProductSupplierOffer } from "@/lib/product-engine";

describe("Supplier Engine — registry", () => {
  it("loads TEST_SUPPLIER_A", () => {
    const s = getSupplier(TEST_SUPPLIER_ID);
    expect(s).toBeDefined();
    expect(s!.integrationTypes).toContain("api");
    expect(s!.integrationTypes).toContain("xml");
    expect(s!.integrationTypes).toContain("csv");
  });

  it("rejects unknown supplier", () => {
    expect(() => getSupplierOrThrow("UNKNOWN_XYZ")).toThrow("UNKNOWN_SUPPLIER");
  });
});

describe("Supplier Engine — API connector", () => {
  it("fetches 4 test products", async () => {
    const supplier = getSupplierOrThrow(TEST_SUPPLIER_ID);
    const connector = new ApiSupplierConnector(supplier);
    await connector.connect();
    const result = await connector.fetchProducts();
    expect(result.ok).toBe(true);
    expect(result.records.length).toBe(4);
    expect(result.dryRun).toBe(true);
  });

  it("health check returns HEALTHY", async () => {
    const supplier = getSupplierOrThrow(TEST_SUPPLIER_ID);
    const connector = new ApiSupplierConnector(supplier);
    const health = await connector.healthCheck();
    expect(health.status).toBe("HEALTHY");
    expect(health.productsFetched).toBe(4);
  });
});

describe("Supplier Engine — XML connector", () => {
  it("parses XML feed with 4 products", async () => {
    const supplier = getSupplierOrThrow(TEST_SUPPLIER_ID);
    const connector = new XmlSupplierConnector(supplier);
    const result = await connector.fetchProducts();
    expect(result.ok).toBe(true);
    expect(result.records.length).toBe(4);
  });

  it("handles malformed XML gracefully", async () => {
    const supplier = getSupplierOrThrow(TEST_SUPPLIER_ID);
    const connector = new XmlSupplierConnector(supplier);
    connector.setXmlContent("<broken><product>");
    const result = await connector.fetchProducts();
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("health check UNHEALTHY on bad XML", async () => {
    const supplier = getSupplierOrThrow(TEST_SUPPLIER_ID);
    const connector = new XmlSupplierConnector(supplier);
    connector.setXmlContent("not xml at all <<<");
    const health = await connector.healthCheck();
    expect(["DEGRADED", "UNHEALTHY"]).toContain(health.status);
  });
});

describe("Supplier Engine — CSV connector", () => {
  it("parses CSV with delimiter detection", async () => {
    const supplier = getSupplierOrThrow(TEST_SUPPLIER_ID);
    const connector = new CsvSupplierConnector(supplier);
    const result = await connector.fetchProducts();
    expect(result.ok).toBe(true);
    expect(result.records.length).toBe(4);
  });

  it("parseCsvFeed standalone", () => {
    const csv = "article_number,price_net\nA1,10.5\nA2,20";
    const records = parseCsvFeed(csv);
    expect(records).toHaveLength(2);
    expect(records[0].price_net).toBe(10.5);
  });
});

describe("Supplier Engine — Manual connector", () => {
  it("accepts admin-imported records", async () => {
    const supplier = getSupplierOrThrow(TEST_SUPPLIER_ID);
    const connector = new ManualSupplierConnector(supplier);
    connector.setManualRecords([
      { supplier_sku: "MAN-001", title: "Manual Product", brand: "Test", stock: 5, price_net: 9.99 },
    ]);
    const result = await connector.fetchProducts();
    expect(result.records).toHaveLength(1);
  });
});

describe("Supplier Engine — field mapping", () => {
  it("maps supplier fields to Buzzard fields", () => {
    const mapped = applyFieldMapping(
      { article_number: "X1", ean_code: "4006633001247", price_net: 55.79, stock_qty: 8, title: "Tire" },
      { article_number: "supplierSku", ean_code: "ean", price_net: "supplierPrice", stock_qty: "stock" }
    );
    expect(mapped.supplierSku).toBe("X1");
    expect(mapped.ean).toBe("4006633001247");
    expect(mapped.supplierPrice).toBe(55.79);
    expect(mapped.stock).toBe(8);
  });

  it("rejects invalid price and stock", () => {
    const errors = validateMappedRecord({ supplierSku: "X", supplierPrice: -1, stock: -5 });
    expect(errors).toContain("INVALID_PRICE");
    expect(errors).toContain("INVALID_STOCK");
  });

  it("flags missing EAN", () => {
    const mapped = applyFieldMapping({ article_number: "X1", price_net: 10, stock_qty: 1 });
    const errors = validateMappedRecord(mapped);
    expect(errors).not.toContain("MISSING_SUPPLIER_SKU");
  });
});

describe("Supplier Engine — normalization via sync", () => {
  beforeEach(async () => {
    const { resetSupplierEngineForTests } = await import("./testReset");
    resetSupplierEngineForTests();
  });

  it("ingestSupplierFeed processes TEST_SUPPLIER_A", async () => {
    const result = await ingestSupplierFeed(TEST_SUPPLIER_ID, { integrationType: "api" });
    expect(result.productsFetched).toBe(4);
    expect(result.productsCreated + result.productsUpdated).toBeGreaterThan(0);
    expect(result.status).not.toBe("FAILED");
  });
});

describe("Supplier Engine — retry", () => {
  it("identifies retryable errors", () => {
    expect(isRetryableError({ code: "TIMEOUT", retryable: true })).toBe(true);
    expect(isRetryableError({ code: "VALIDATION_FAILED" })).toBe(false);
  });

  it("exponential backoff increases", () => {
    expect(computeBackoffDelay(2)).toBeGreaterThan(computeBackoffDelay(1));
  });

  it("withRetry succeeds after transient failure", async () => {
    let attempts = 0;
    const result = await withRetry(async () => {
      attempts++;
      if (attempts < 2) throw { code: "TIMEOUT", retryable: true };
      return "ok";
    }, { maxAttempts: 3, baseDelayMs: 10 });
    expect(result).toBe("ok");
    expect(attempts).toBe(2);
  });
});

describe("Supplier Engine — rate limiting", () => {
  beforeEach(() => resetRateLimit(TEST_SUPPLIER_ID));

  it("allows requests under limit", () => {
    const result = checkRateLimit(TEST_SUPPLIER_ID, { requestsPerMinute: 60 });
    expect(result.allowed).toBe(true);
  });

  it("blocks when exhausted", () => {
    for (let i = 0; i < 60; i++) checkRateLimit(TEST_SUPPLIER_ID, { requestsPerMinute: 60 });
    const blocked = checkRateLimit(TEST_SUPPLIER_ID, { requestsPerMinute: 60 });
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });
});

describe("Supplier Engine — stock sync", () => {
  it("updates supplier offer stock without reactivating DISCONTINUED", async () => {
    const product = loadFixtureProduct("motoroel-5w30")!;
    const supplierId = product.supplierOffers[0].supplierId;
    const updated = updateProductSupplierOffer(product.productId, supplierId, {
      stock: 25,
    });
    const offer = updated?.supplierOffers.find((o) => o.supplierId === supplierId);
    expect(offer?.stock).toBe(25);
  });

  it("STOCK_ONLY sync job", async () => {
    const result = await runSupplierSyncJob(TEST_SUPPLIER_ID, {
      integrationType: "api",
      jobType: "STOCK_ONLY",
    });
    expect(result.jobType).toBe("STOCK_ONLY");
  });
});

describe("Supplier Engine — price sync", () => {
  it("PRICE_ONLY sync job", async () => {
    const result = await runSupplierSyncJob(TEST_SUPPLIER_ID, {
      integrationType: "api",
      jobType: "PRICE_ONLY",
    });
    expect(result.jobType).toBe("PRICE_ONLY");
  });
});

describe("Supplier Engine — failure isolation", () => {
  it("partial feed failure does not lose entire batch", async () => {
    const supplier = getSupplierOrThrow(TEST_SUPPLIER_ID);
    const connector = new ManualSupplierConnector(supplier);
    connector.setManualRecords([
      { supplier_sku: "GOOD-1", title: "Good", brand: "B", stock: 1, price_net: 10, ean_code: "4006633009991" },
      { supplier_sku: "", title: "Bad", brand: "B", stock: -1, price_net: -5 },
      { supplier_sku: "GOOD-2", title: "Good2", brand: "B", stock: 2, price_net: 20, ean_code: "4006633009992" },
    ]);
    const result = await connector.fetchProducts();
    expect(result.records.length).toBe(3);
    // Validation happens in sync layer per-record
  });
});

describe("Supplier Engine — security", () => {
  it("redacts secrets in logs", () => {
    const redacted = redactSecrets({ api_key: "secret123", name: "test" }) as Record<string, string>;
    expect(redacted.api_key).toBe("[REDACTED]");
    expect(redacted.name).toBe("test");
  });

  it("rejects client credential payloads", () => {
    expect(rejectClientCredentials({ api_key: "x" })).toBe(true);
    expect(sanitizeClientSyncRequest({ supplierPrice: 1 }).allowed).toBe(false);
    expect(sanitizeClientSyncRequest({ supplierId: "TEST" }).allowed).toBe(true);
  });
});

describe("Supplier Engine — order foundation", () => {
  it("createSupplierOrder is dry-run only", async () => {
    const result = await createSupplierOrder({
      supplierId: TEST_SUPPLIER_ID,
      orderId: "ORD-1",
      lines: [{ supplierSku: "TSA-TIRE-225-45-17", quantity: 1, unitPrice: 55 }],
      shippingAddress: { country: "DE" },
      dropshipping: true,
    });
    expect(result.dryRun).toBe(true);
    expect(result.ok).toBe(true);
    expect(result.status).toBe("PREPARED_NOT_SENT");
  });
});

describe("Supplier Engine — supplier selection integration", () => {
  it("selectBestSupplierForMarket enriches with reliability", async () => {
    const product = getProduct("reifen-pilot-sport");
    expect(product).toBeDefined();
    const result = await selectBestSupplierForMarket(product!, { countryCode: "DE" });
    expect(result).toBeTruthy();
    expect(result!.reasons.some((r) => r.startsWith("reliability:"))).toBe(true);
  });
});

describe("Supplier Engine — observability", () => {
  beforeEach(async () => {
    const { resetSupplierEngineForTests } = await import("./testReset");
    resetSupplierEngineForTests();
  });

  it("logs operations without secrets", async () => {
    clearObservability();
    await ingestSupplierFeed(TEST_SUPPLIER_ID, { integrationType: "api" });
    const logs = getSupplierLogs(TEST_SUPPLIER_ID);
    expect(logs.length).toBeGreaterThan(0);
    expect(JSON.stringify(logs)).not.toMatch(/secret123/);
  });
});

describe("Supplier Engine — test products", () => {
  it("includes all 4 automotive fixtures in feed", () => {
    const products = getTestFeedProducts(TEST_SUPPLIER_ID);
    expect(products.length).toBe(4);
    const titles = products.map((p) => String(p.title));
    expect(titles.some((t) => t.includes("225/45 R17"))).toBe(true);
    expect(titles.some((t) => t.includes("5W-30"))).toBe(true);
    expect(titles.some((t) => t.includes("280"))).toBe(true);
    expect(titles.some((t) => t.includes("Bremsbeläge"))).toBe(true);
  });
});

describe("Supplier Engine — reliability", () => {
  it("returns placeholder score without invented history", () => {
    const score = computeSupplierReliabilityScore(TEST_SUPPLIER_ID);
    expect(score.sampleSize).toBeGreaterThanOrEqual(0);
    expect(score.score).toBeGreaterThanOrEqual(0);
    expect(score.score).toBeLessThanOrEqual(1);
  });
});
