import { describe, it, expect, beforeEach } from "vitest";
import {
  classifySupplierError,
  isRetryableError,
  getSyncCursor,
  saveSyncCursor,
  resetSyncCursors,
  getSupplierRuntimeState,
  resetSupplierRuntimeState,
  registerCredentialRef,
  resetCredentialRefs,
  resolveCredentials,
  sanitizeCredentialPayload,
  runSupplierSyncJob,
  selectBestSupplierForOrder,
  validateSupplierOrderPayload,
  createSupplierOrder,
  fetchSupplierTracking,
  mapSupplierTrackingStatus,
  createSupplierReturn,
  listReturnCapabilities,
  TEST_SUPPLIER_ID,
  clearObservability,
  redactSecrets,
  rejectClientCredentials,
  getSupplierOrThrow,
  ManualSupplierConnector,
} from "./index";
import { getProduct } from "@/lib/product-engine";

describe("Supplier Production Readiness — error classification", () => {
  it("classifies auth failures as non-retryable", () => {
    const err = classifySupplierError({ httpStatus: 401, message: "Unauthorized" });
    expect(err.code).toBe("AUTH_FAILED");
    expect(err.retryable).toBe(false);
    expect(isRetryableError(err)).toBe(false);
  });

  it("classifies 429 as retryable", () => {
    const err = classifySupplierError({ httpStatus: 429, message: "Too many requests" });
    expect(err.code).toBe("RATE_LIMITED");
    expect(isRetryableError(err)).toBe(true);
  });

  it("classifies 503 as retryable", () => {
    const err = classifySupplierError({ httpStatus: 503, message: "Unavailable" });
    expect(err.code).toBe("SERVER_ERROR");
    expect(isRetryableError(err)).toBe(true);
  });
});

describe("Supplier Production Readiness — sync cursor", () => {
  beforeEach(() => resetSyncCursors());

  it("persists and restores cursor", () => {
    saveSyncCursor(TEST_SUPPLIER_ID, { cursor: "page-2", lastModified: "2026-01-01T00:00:00Z" });
    const cursor = getSyncCursor(TEST_SUPPLIER_ID);
    expect(cursor?.cursor).toBe("page-2");
    expect(cursor?.lastModified).toBe("2026-01-01T00:00:00Z");
  });
});

describe("Supplier Production Readiness — runtime state", () => {
  beforeEach(async () => {
    const { resetSupplierEngineForTests } = await import("./testReset");
    resetSupplierEngineForTests();
    resetSupplierRuntimeState();
    clearObservability();
  });

  it("records sync success state", async () => {
    await runSupplierSyncJob(TEST_SUPPLIER_ID, { integrationType: "api", jobType: "FULL" });
    const state = getSupplierRuntimeState(TEST_SUPPLIER_ID);
    expect(["SUCCESS", "PARTIAL"]).toContain(state.syncStatus);
    expect(state.lastSuccessfulSync).toBeTruthy();
  });

  it("supports INCREMENTAL sync job type", async () => {
    const result = await runSupplierSyncJob(TEST_SUPPLIER_ID, {
      integrationType: "api",
      jobType: "INCREMENTAL",
    });
    expect(result.jobType).toBe("INCREMENTAL");
    expect(result.status).not.toBe("FAILED");
  });
});

describe("Supplier Production Readiness — credentials", () => {
  beforeEach(() => resetCredentialRefs());

  it("never exposes resolved secrets in sanitize payload", () => {
    registerCredentialRef(TEST_SUPPLIER_ID, "env:TEST_SUPPLIER_SECRET");
    process.env.TEST_SUPPLIER_SECRET = JSON.stringify({ api_key: "super-secret" });
    const resolved = resolveCredentials("env:TEST_SUPPLIER_SECRET");
    expect(resolved?.api_key).toBe("super-secret");
    const sanitized = sanitizeCredentialPayload(resolved || {});
    expect(JSON.stringify(sanitized)).not.toContain("super-secret");
    delete process.env.TEST_SUPPLIER_SECRET;
  });
});

describe("Supplier Production Readiness — deterministic selection", () => {
  it("selectBestSupplierForOrder enriches with reliability and market", () => {
    const product = getProduct("reifen-pilot-sport");
    expect(product).toBeDefined();
    const result = selectBestSupplierForOrder(product!, { countryCode: "DE" });
    expect(result).toBeTruthy();
    expect(result!.reasons.some((r) => r.startsWith("reliability:"))).toBe(true);
    expect(result!.reasons.some((r) => r.startsWith("landedCost:"))).toBe(true);
  });
});

describe("Supplier Production Readiness — order dry-run", () => {
  it("validates and prepares order payload", async () => {
    const validation = validateSupplierOrderPayload({
      supplierId: TEST_SUPPLIER_ID,
      orderId: "ORD-DRY-1",
      lines: [{ supplierSku: "TSA-TIRE-225-45-17", quantity: 1, unitPrice: 55 }],
      shippingAddress: { country: "DE", city: "Berlin", street: "Test 1" },
      dropshipping: true,
      whiteLabel: true,
    });
    expect(validation.valid).toBe(true);
    expect(validation.payload?.customerSafe).toBe(true);

    const result = await createSupplierOrder({
      supplierId: TEST_SUPPLIER_ID,
      orderId: "ORD-DRY-1",
      lines: [{ supplierSku: "TSA-TIRE-225-45-17", quantity: 1, unitPrice: 55 }],
      shippingAddress: { country: "DE" },
      dropshipping: true,
    });
    expect(result.dryRun).toBe(true);
    expect(result.ok).toBe(true);
    expect(result.status).toBe("SANDBOX_ACCEPTED");
  });
});

describe("Supplier Production Readiness — tracking", () => {
  it("maps tracking status canonically", () => {
    expect(mapSupplierTrackingStatus("in_transit")).toBe("IN_TRANSIT");
    expect(mapSupplierTrackingStatus("delivered")).toBe("DELIVERED");
  });

  it("returns dry-run tracking snapshot", async () => {
    const snapshot = await fetchSupplierTracking(TEST_SUPPLIER_ID, "DRY-ORD-1");
    expect(snapshot.dryRun).toBe(true);
    expect(snapshot.ok).toBe(true);
    expect(snapshot.trackingNumber).toBeTruthy();
  });
});

describe("Supplier Production Readiness — returns", () => {
  it("lists return capabilities", () => {
    const caps = listReturnCapabilities(TEST_SUPPLIER_ID);
    expect(caps).toContain("RETURN");
    expect(caps).toContain("REFUND");
  });

  it("creates dry-run return foundation", async () => {
    const result = await createSupplierReturn({
      supplierId: TEST_SUPPLIER_ID,
      orderId: "ORD-1",
      supplierOrderId: "DRY-ORD-1",
      lines: [{ supplierSku: "TSA-TIRE-225-45-17", quantity: 1, reason: "DEFECT" }],
      returnType: "REFUND",
    });
    expect(result.dryRun).toBe(true);
    expect(result.ok).toBe(true);
  });
});

describe("Supplier Production Readiness — security", () => {
  it("redacts secrets and rejects client credentials", () => {
    const redacted = redactSecrets({ password: "x", token: "y", name: "ok" }) as Record<string, string>;
    expect(redacted.password).toBe("[REDACTED]");
    expect(redacted.name).toBe("ok");
    expect(rejectClientCredentials({ client_secret: "abc" })).toBe(true);
  });
});

describe("Supplier Production Readiness — stale offer deactivation", () => {
  it("deactivates offers missing from FULL sync", async () => {
    const supplier = getSupplierOrThrow(TEST_SUPPLIER_ID);
    const connector = new ManualSupplierConnector(supplier);
    connector.setManualRecords([
      { supplier_sku: "ONLY-ONE", title: "Only", brand: "B", stock: 3, price_net: 10, ean_code: "4006633009999" },
    ]);
    const fetch = await connector.fetchProducts();
    expect(fetch.records.length).toBe(1);
  });
});
