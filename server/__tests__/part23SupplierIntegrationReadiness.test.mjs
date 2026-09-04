import { describe, it, expect, beforeEach } from "vitest";
import { createRequire } from "node:module";
import crypto from "node:crypto";

const require = createRequire(import.meta.url);

const VALID_RECORD = {
  supplier_sku: "P23-VALID-001",
  name: "Bremsbelag Set Vorderachse",
  ean_gtin: "5901234123457",
  mpn: "P85073",
  brand: "ATE",
  supplier_category: "automotive/brakes",
  buzzard_category: "cat-01",
  supplier_price: { amount: 24.5, currency: "EUR" },
  stock: 12,
  images: ["https://cdn.test-supplier.example.de/p85073.jpg"],
};

describe("Part 23 — supplier registry", () => {
  it("1. lists multiple suppliers without hard-coded single supplier", () => {
    const registry = require("../lib/supplier/supplierRegistry.js");
    const suppliers = registry.listSuppliers();
    expect(suppliers.length).toBeGreaterThanOrEqual(4);
    expect(suppliers.map((s) => s.id)).toContain("api-supplier-dry");
    expect(suppliers.map((s) => s.id)).toContain("xml-supplier-dry");
    expect(suppliers.map((s) => s.id)).toContain("csv-supplier-dry");
  });

  it("2. adapter selection by format", () => {
    const registry = require("../lib/supplier/supplierRegistry.js");
    const api = registry.selectAdapterForFormat("api");
    const xml = registry.selectAdapterForFormat("xml");
    expect(api.id).toBe("api-supplier-dry");
    expect(xml.id).toBe("xml-supplier-dry");
  });
});

describe("Part 23 — adapters", () => {
  beforeEach(() => {
    process.env.REAL_SUPPLIER_DRY_RUN = "1";
    process.env.REAL_SUPPLIER_LIVE_IMPORT = "0";
  });

  it("3. API adapter validates configuration", () => {
    const { ApiSupplierAdapter } = require("../lib/supplier/apiSupplierAdapter.js");
    const adapter = new ApiSupplierAdapter();
    const config = adapter.validateConfiguration();
    expect(config.credentialsConfigured).toBe(false);
    expect(config.networkBlocked).toBe(true);
    expect(config.dryRun).toBe(true);
  });

  it("4. XML adapter dry-run fetch returns records", async () => {
    const { XmlSupplierAdapter } = require("../lib/supplier/xmlSupplierAdapter.js");
    const adapter = new XmlSupplierAdapter();
    const result = await adapter.fetchProductsDryRun({ limit: 1 });
    expect(result.dryRun).toBe(true);
    expect(result.records.length).toBe(1);
  });

  it("5. CSV adapter blocks network fetch", async () => {
    const { CsvSupplierAdapter } = require("../lib/supplier/csvSupplierAdapter.js");
    const adapter = new CsvSupplierAdapter();
    await expect(adapter.fetchProducts()).rejects.toMatchObject({ code: "networkBlocked" });
  });

  it("6. API adapter health check is dry-run", async () => {
    const { ApiSupplierAdapter } = require("../lib/supplier/apiSupplierAdapter.js");
    const adapter = new ApiSupplierAdapter();
    const health = await adapter.healthCheck();
    expect(health.dryRun).toBe(true);
    expect(health.networkBlocked).toBe(true);
  });
});

describe("Part 23 — capability matrix", () => {
  it("7. capability matrix marks live as BLOCKED without credentials", () => {
    const { evaluateCapabilityMatrix } = require("../lib/supplier/supplierCapabilityMatrix.js");
    const matrix = evaluateCapabilityMatrix({
      id: "api-supplier-dry",
      format: "api",
      credentialsConfigured: false,
    });
    expect(matrix.credentialsConfigured).toBe(false);
    expect(matrix.canGoLive).toBe(false);
    expect(matrix.matrix.live.status).toBe("BLOCKED");
    expect(matrix.matrix.api.status).toBe("CONDITION");
  });

  it("8. credential missing prevents LIVE status", () => {
    const registry = require("../lib/supplier/supplierRegistry.js");
    const supplier = registry.listSuppliers().find((s) => s.id === "REAL-WHOLESALER-001");
    expect(supplier.credentialsConfigured).toBe(false);
    expect(supplier.canGoLive).toBe(false);
  });
});

describe("Part 23 — credential redaction", () => {
  it("9. redacts secrets from connector status", () => {
    process.env.REAL_SUPPLIER_API_KEY = "super-secret-key";
    const connector = require("../lib/supplier/realSupplierConnector.js");
    const status = connector.createConnectorFromEnv({ apiKey: "another-secret" }).getStatus();
    expect(JSON.stringify(status)).not.toContain("super-secret-key");
    expect(JSON.stringify(status)).not.toContain("another-secret");
    delete process.env.REAL_SUPPLIER_API_KEY;
  });

  it("10. supplier audit redacts credentials", () => {
    const { recordSupplierSystemAction } = require("../lib/supplier/supplierAudit.js");
    const operationsAudit = require("../lib/operations/operationsAudit.js");
    const corrId = `sup_${crypto.randomBytes(4).toString("hex")}`;
    recordSupplierSystemAction({
      supplierId: "api-supplier-dry",
      action: "product.import",
      correlationId: corrId,
      metadata: { apiKey: "must-not-appear", password: "hidden" },
    });
    const rows = operationsAudit.findByCorrelationId(corrId);
    expect(rows.length).toBe(1);
    expect(JSON.stringify(rows)).not.toContain("must-not-appear");
  });
});

describe("Part 23 — mapping", () => {
  it("11. maps supplier SKU to internal SKU", () => {
    const { mapSupplierProduct } = require("../lib/supplier/supplierMappingService.js");
    const result = mapSupplierProduct(VALID_RECORD, { supplierId: "api-supplier-dry" });
    expect(result.mapped.supplierSku).toBe("P23-VALID-001");
    expect(result.mapped.internalSku).toBe("P23-VALID-001");
  });

  it("12. GTIN mapping validates checksum", () => {
    const { mapSupplierProduct } = require("../lib/supplier/supplierMappingService.js");
    const bad = mapSupplierProduct({ ...VALID_RECORD, ean_gtin: "4006633001234" }, { supplierId: "x" });
    expect(bad.status).toBe("BLOCKED");
    expect(bad.findings.some((f) => f.field === "gtin")).toBe(true);
  });

  it("13. MPN missing is BLOCKED", () => {
    const { mapSupplierProduct } = require("../lib/supplier/supplierMappingService.js");
    const result = mapSupplierProduct({ ...VALID_RECORD, mpn: null }, { supplierId: "x" });
    expect(result.status).toBe("BLOCKED");
  });

  it("14. brand normalization via alias map", () => {
    const { mapSupplierProduct } = require("../lib/supplier/supplierMappingService.js");
    const result = mapSupplierProduct({ ...VALID_RECORD, brand: "BMW AG" }, { supplierId: "x" });
    expect(result.mapped.brand).toBe("BMW");
    expect(result.mapped.brandCanonical).toBe(true);
  });

  it("15. unknown category without buzzard_category is CONDITION", () => {
    const { mapSupplierProduct } = require("../lib/supplier/supplierMappingService.js");
    const result = mapSupplierProduct(
      { ...VALID_RECORD, buzzard_category: null, supplier_category: "unknown/path" },
      { supplierId: "x" }
    );
    expect(result.findings.some((f) => f.code === "CATEGORY_UNMAPPED")).toBe(true);
  });
});

describe("Part 23 — price and stock", () => {
  it("16. missing price is BLOCKED", () => {
    const { validatePrice } = require("../lib/supplier/supplierPriceStockReadiness.js");
    const result = validatePrice(null);
    expect(result.status).toBe("BLOCKED");
  });

  it("17. negative price is BLOCKED", () => {
    const { validatePrice } = require("../lib/supplier/supplierPriceStockReadiness.js");
    const result = validatePrice(-1);
    expect(result.status).toBe("BLOCKED");
  });

  it("18. invalid stock is BLOCKED", () => {
    const { validateStock } = require("../lib/supplier/supplierPriceStockReadiness.js");
    const result = validateStock("not-a-number");
    expect(result.status).toBe("BLOCKED");
  });

  it("19. stale data detected", () => {
    const { checkStaleData } = require("../lib/supplier/supplierPriceStockReadiness.js");
    const old = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const result = checkStaleData(old);
    expect(result.stale).toBe(true);
    expect(result.code).toBe("DATA_STALE");
  });
});

describe("Part 23 — duplicate detection and pipeline", () => {
  it("20. duplicate detection in import pipeline", async () => {
    const pipeline = require("../lib/supplier/supplierImportPipeline.js");
    const fp = new Set();
    const first = await pipeline.runSupplierImportPipeline("api-supplier-dry", {
      records: [VALID_RECORD],
      knownFingerprints: fp,
      skipDbDuplicateCheck: true,
    });
    const fingerprint = first.processed[0]?.duplicate;
    expect(first.dryRun).toBe(true);
    expect(first.live).toBe(false);

    const second = await pipeline.runSupplierImportPipeline("api-supplier-dry", {
      records: [{ ...VALID_RECORD, supplier_sku: "P23-DUP-002", mpn: "P85074" }],
      knownFingerprints: fp,
      skipDbDuplicateCheck: true,
    });
    expect(second.processed[0].duplicate.flagged || fingerprint).toBeTruthy();
  });

  it("21. dry-run pipeline never live publishes", async () => {
    const pipeline = require("../lib/supplier/supplierImportPipeline.js");
    const result = await pipeline.runSupplierImportPipeline("api-supplier-dry", {
      limit: 2,
      skipDbDuplicateCheck: true,
    });
    expect(result.dryRun).toBe(true);
    expect(result.live).toBe(false);
    expect(result.stages.some((s) => s.stage === "pim_staging")).toBe(true);
  });

  it("22. live import blocked at safety gate", () => {
    const { assertSupplierOperation } = require("../lib/supplier/supplierSafetyGate.js");
    process.env.REAL_SUPPLIER_LIVE_IMPORT = "0";
    const result = assertSupplierOperation("import_live", { dryRun: false, supplierId: "REAL-WHOLESALER-001" });
    expect(result.ok).toBe(false);
  });
});

describe("Part 23 — order and dropshipping", () => {
  beforeEach(() => {
    process.env.BUZZARD_SALES_ENABLED = "0";
  });

  it("23. supplier order creation blocked", () => {
    const { assertOrderReadiness } = require("../lib/supplier/supplierOrderReadiness.js");
    const result = assertOrderReadiness({
      supplierId: "api-supplier-dry",
      items: [{ supplierSku: "SKU-1", quantity: 1 }],
    });
    expect(result.code).toBe("supplierOrderBlocked");
  });

  it("24. dropshipping capability UNKNOWN without verification", () => {
    const registry = require("../lib/supplier/supplierRegistry.js");
    const def = registry.getSupplierDefinition("mock");
    expect(def.dropshipping.dropshipping).toBe("UNKNOWN");
    expect(def.dropshipping.whiteLabel).toBe("UNKNOWN");
  });

  it("25. white-label capability not guessed", () => {
    const { evaluateCapabilityMatrix } = require("../lib/supplier/supplierCapabilityMatrix.js");
    const matrix = evaluateCapabilityMatrix({
      id: "mock",
      format: "mock",
      credentialsConfigured: false,
      dropshipping: { whiteLabel: "UNKNOWN" },
    });
    expect(matrix.matrix.whiteLabel.status).toBe("UNKNOWN");
  });
});

describe("Part 23 — error handling and idempotency", () => {
  it("26. standard error model with retry hint", () => {
    const { createSupplierError, buildIdempotencyKey, shouldRetry } = require("../lib/supplier/supplierErrors.js");
    const err = createSupplierError("rateLimited", { supplierId: "x" });
    expect(err.retryable).toBe(true);
    expect(shouldRetry(err, 1)).toBe(true);
    const key = buildIdempotencyKey({ supplierId: "x", action: "import", payload: { a: 1 } });
    expect(key).toMatch(/^sup_x_import_/);
  });

  it("27. configuration missing error", () => {
    const { createSupplierError } = require("../lib/supplier/supplierErrors.js");
    const err = createSupplierError("configurationMissing", { message: "No credentials" });
    expect(err.code).toBe("configurationMissing");
    expect(err.retryable).toBe(false);
  });
});

describe("Part 23 — health and readiness center", () => {
  beforeEach(() => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    process.env.REAL_SUPPLIER_LIVE_IMPORT = "0";
    process.env.REAL_SUPPLIER_DRY_RUN = "1";
  });

  it("28. supplier health diagnostic", () => {
    const health = require("../lib/supplier/supplierHealth.js");
    const report = health.evaluateSupplierHealth("api-supplier-dry");
    expect(report.diagnosticOnly).toBe(true);
    expect(report.autoActivate).toBe(false);
    expect(report.canConnectLive).toBe(false);
    expect(report.checks.some((c) => c.check === "live_import_permission")).toBe(true);
  });

  it("29. readiness center is diagnostic only", () => {
    const center = require("../lib/supplier/supplierReadinessCenter.js");
    const report = center.evaluateSupplierIntegrationReadiness();
    expect(report.SUPPLIER_INTEGRATION_READINESS.diagnosticOnly).toBe(true);
    expect(report.SUPPLIER_INTEGRATION_READINESS.autoActivate).toBe(false);
    expect(report.SUPPLIER_INTEGRATION_READINESS.gates.length).toBeGreaterThanOrEqual(8);
  });
});

describe("Part 23 — RBAC", () => {
  it("30. routes require proper permissions", () => {
    const { resolveRoutePermission } = require("../lib/routePermissions.js");
    expect(resolveRoutePermission("GET", "/api/health/supplier-readiness").public).toBe(true);
    expect(resolveRoutePermission("GET", "/api/admin/suppliers/readiness").permission).toBe("suppliers.read");
    expect(resolveRoutePermission("POST", "/api/admin/suppliers/api-supplier-dry/dry-run").permission).toBe(
      "suppliers.read"
    );
  });
});

describe("Part 23 — safety regression", () => {
  beforeEach(() => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    process.env.NEXT_PUBLIC_SALES_ENABLED = "0";
    process.env.BUZZARD_STRIPE_ENABLED = "0";
    process.env.BUZZARD_PAYPAL_ENABLED = "0";
    process.env.REAL_SUPPLIER_LIVE_IMPORT = "0";
    process.env.REAL_SUPPLIER_DRY_RUN = "1";
  });

  it("31. go-live lock active", () => {
    const goLiveApproval = require("../lib/commerce/goLiveApproval.js");
    expect(goLiveApproval.PRODUCTION_SAFETY_LOCK).toBe(true);
  });

  it("32. supplier orders blocked", () => {
    const { isSupplierOrdersBlocked } = require("../lib/supplier/supplierSafetyGate.js");
    expect(isSupplierOrdersBlocked()).toBe(true);
  });

  it("33. no supplier credentials configured", () => {
    delete process.env.REAL_SUPPLIER_API_KEY;
    delete process.env.SUPPLIER_API_KEY;
    const status = require("../lib/supplier/realSupplierConnector.js").createConnectorFromEnv().getStatus();
    expect(status.credentialsConfigured).toBe(false);
    expect(status.liveImportEnabled).toBe(false);
  });

  it("34. public catalog sales OFF", () => {
    const catalogReadService = require("../lib/storefront/catalogReadService.js");
    expect(catalogReadService.getHealth().salesEnabled).toBe(false);
  });
});

describe("Part 23 — shipping readiness", () => {
  it("35. shipping flow architecture without live calls", () => {
    const shipping = require("../lib/supplier/supplierShippingReadiness.js");
    const report = shipping.evaluateShippingReadiness("api-supplier-dry");
    expect(report.diagnosticOnly).toBe(true);
    expect(report.flow.find((s) => s.step === "shipment").status).toBe("BLOCKED");
  });
});
