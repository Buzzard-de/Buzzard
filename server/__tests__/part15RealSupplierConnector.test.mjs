import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

describe("supplierProductionGuard", () => {
  const guard = require("../lib/supplier/supplierProductionGuard.js");

  it("marks SUP-DEMO-001 as TEST ONLY", () => {
    expect(guard.isTestOnlySupplierId("SUP-DEMO-001")).toBe(true);
  });

  it("marks demo-automotive.example as TEST ONLY host", () => {
    expect(guard.isTestOnlyHost("https://demo-automotive.example/api/products.json")).toBe(true);
  });

  it("blocks demo supplier from production assertion", () => {
    expect(() =>
      guard.assertProductionSupplier({
        supplierId: "SUP-DEMO-001",
        apiUrl: "https://demo-automotive.example/api/products.json",
      })
    ).toThrow(/TEST ONLY/);
  });

  it("allows unknown real supplier code with non-test host", () => {
    expect(() =>
      guard.assertProductionSupplier({
        supplierId: "REAL-WHOLESALER-001",
        apiUrl: "https://api.wholesaler.example.de/catalog",
      })
    ).not.toThrow();
  });
});

describe("realSupplierConnector validation", () => {
  const connector = require("../lib/supplier/realSupplierConnector.js");

  const validRecord = {
    supplier_sku: "WH-12345",
    name: "Bremsbelag Set Vorderachse",
    ean_gtin: "5901234123457",
    mpn: "P85073",
    brand: "ATE",
    images: ["https://cdn.supplier.de/images/p85073.jpg"],
    stock: 10,
  };

  it("rejects invalid GTIN checksum", () => {
    const result = connector.validateGtin("4006633001234");
    expect(result.ok).toBe(false);
    expect(result.code).toMatch(/invalid/);
  });

  it("accepts valid GTIN checksum", () => {
    const result = connector.validateGtin("5901234123457");
    expect(result.ok).toBe(true);
  });

  it("rejects missing MPN", () => {
    const result = connector.validateMpn("");
    expect(result.ok).toBe(false);
    expect(result.code).toBe("missing_mpn");
  });

  it("rejects mock MPN placeholder", () => {
    const result = connector.validateMpn("MOCK-001");
    expect(result.ok).toBe(false);
  });

  it("rejects missing image", () => {
    const result = connector.validateImageUrl("");
    expect(result.ok).toBe(false);
    expect(result.code).toBe("missing_image");
  });

  it("rejects example.com image host", () => {
    const result = connector.validateImageUrl("https://example.com/product.jpg");
    expect(result.ok).toBe(false);
    expect(result.code).toBe("test_only_image_host");
  });

  it("validates complete supplier record", () => {
    const result = connector.validateSupplierRecord(validRecord);
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects record with missing MPN and image", () => {
    const result = connector.validateSupplierRecord({
      supplier_sku: "X1",
      name: "Test Part",
      ean_gtin: "5901234123457",
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.field === "mpn")).toBe(true);
    expect(result.errors.some((e) => e.field === "images")).toBe(true);
  });
});

describe("realSupplierConnector safety and dry-run", () => {
  const { RealSupplierConnector } = require("../lib/supplier/realSupplierConnector.js");
  const envBackup = { ...process.env };

  beforeEach(() => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    process.env.STRIPE_ENABLED = "0";
    process.env.PAYPAL_ENABLED = "0";
    process.env.BUZZARD_SUPPLIER_ORDERS_ENABLED = "0";
    process.env.REAL_SUPPLIER_DRY_RUN = "1";
    process.env.REAL_SUPPLIER_LIVE_IMPORT = "0";
  });

  afterEach(() => {
    process.env = { ...envBackup };
  });

  it("rejects unknown supplier (no code configured)", async () => {
    const conn = new RealSupplierConnector({ supplierCode: "", apiUrl: "", apiKey: "" });
    const result = await conn.fetchCatalog();
    expect(result.ok).toBe(false);
    expect(result.error).toBe("unknown_supplier");
  });

  it("blocks demo supplier from live fetch", async () => {
    const conn = new RealSupplierConnector({
      supplierCode: "SUP-DEMO-001",
      apiUrl: "https://demo-automotive.example/api/products.json",
      apiKey: "fake-key",
      dryRun: false,
      liveImportEnabled: true,
    });
    const result = await conn.fetchCatalog();
    expect(result.ok).toBe(false);
    expect(result.error).toBe("test_only_supplier");
  });

  it("demo supplier cannot pass assertCanConnect", () => {
    const conn = new RealSupplierConnector({
      supplierCode: "SUP-DEMO-001",
      apiUrl: "https://demo-automotive.example/api/products.json",
      apiKey: "fake-key",
      dryRun: false,
      liveImportEnabled: true,
    });
    expect(() => conn.assertCanConnect()).toThrow(/TEST ONLY/);
  });

  it("keeps safety gates active in status", () => {
    const conn = new RealSupplierConnector({
      supplierCode: "REAL-WHOLESALER-001",
      apiUrl: "https://api.wholesaler.de/v1/catalog",
      apiKey: "secret",
    });
    const status = conn.getStatus();
    expect(status.productionSafetyOk).toBe(true);
    expect(status.goLiveLockActive).toBe(true);
    expect(status.salesEnabled).toBe(false);
  });

  it("live import remains disabled by default", async () => {
    const conn = new RealSupplierConnector({
      supplierCode: "REAL-WHOLESALER-001",
      apiUrl: "https://api.wholesaler.de/v1/catalog",
      apiKey: "secret",
      dryRun: true,
      liveImportEnabled: false,
    });
    const result = await conn.fetchCatalog();
    expect(result.dryRun).toBe(true);
    expect(result.live).toBe(false);
    expect(result.records).toEqual([]);
    expect(result.message).toMatch(/blocked/i);
  });

  it("does not expose API key in status config", () => {
    const conn = new RealSupplierConnector({
      supplierCode: "REAL-WHOLESALER-001",
      apiUrl: "https://api.wholesaler.de/v1/catalog",
      apiKey: "super-secret-key",
    });
    const status = conn.getStatus();
    expect(status.config.apiKey).toBe("[REDACTED]");
    expect(JSON.stringify(status)).not.toContain("super-secret-key");
  });

  it("canAttemptLiveFetch blocked when live import disabled", () => {
    const { canAttemptLiveFetch, resolveConfig } = require("../lib/supplier/realSupplierConnector.js");
    const config = resolveConfig({
      supplierCode: "REAL-WHOLESALER-001",
      apiUrl: "https://api.wholesaler.de/v1/catalog",
      apiKey: "secret",
      dryRun: false,
      liveImportEnabled: false,
    });
    config._apiKeyRaw = "secret";
    const check = canAttemptLiveFetch(config);
    expect(check.ok).toBe(false);
    expect(check.reason).toBe("live_import_disabled");
  });

  it("isLiveImportEnabled returns false by default", () => {
    delete process.env.REAL_SUPPLIER_LIVE_IMPORT;
    const { isLiveImportEnabled } = require("../lib/supplier/realSupplierConnector.js");
    expect(isLiveImportEnabled()).toBe(false);
  });
});

describe("realSupplierConnector normalize (mock data)", () => {
  const { normalizeSupplierProduct } = require("../lib/supplier/realSupplierConnector.js");

  it("normalizes mock supplier payload shape", () => {
    const normalized = normalizeSupplierProduct(
      {
        supplier_sku: "MOCK-001",
        ean_gtin: "5901234123457",
        mpn: "P85073",
        brand: "MockBrand",
        name: "Mock Bremsbelag",
        supplier_price: { amount: 24.5, currency: "EUR" },
        stock: 42,
        images: ["https://cdn.test-supplier.de/mock.jpg"],
      },
      "REAL-TEST-001"
    );

    expect(normalized.supplierCode).toBe("REAL-TEST-001");
    expect(normalized.supplierSku).toBe("MOCK-001");
    expect(normalized.gtin).toBe("5901234123457");
    expect(normalized.mpn).toBe("P85073");
    expect(normalized.purchasePrice).toBe(24.5);
  });
});
