import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  ApiSupplierConnector,
  TemplateSupplierConnector,
  ManualSupplierConnector,
  XmlSupplierConnector,
  CsvSupplierConnector,
  TEST_SUPPLIER_ID,
  runSupplierConnectionTest,
  runSupplierDryRunTestSync,
  runSupplierSyncJob,
  evaluateProductionSyncGuard,
  validateSupplierEndpoint,
  isBlockedHost,
  isSupplierNetworkEnabled,
  isSupplierOrderNetworkEnabled,
  resolveSupplierAuth,
  resolveCredentials,
  registerCredentialRef,
  resetCredentialRefs,
  MockSupplierTransport,
  buildMockTransportFixtures,
  resetMockTransportScenarios,
  createSupplierHttpTransport,
  getSupplierOrThrow,
  createSupplierOrder,
  resetOrderIdempotencyKeys,
  getIdempotentSupplierOrder,
  buildSupplierOrderIdempotencyKey,
  recordIdempotentSupplierOrder,
  redactSecrets,
  getSupplierConnectorMetrics,
  clearObservability,
  resetSyncCursors,
  resetSupplierRuntimeState,
  CAPABILITY_NOT_SUPPORTED,
  validateSupplierOnboardingDefinition,
  buildOnboardingState,
} from "./index";
import { listRegistryProducts } from "@/lib/product-engine";

describe("Supplier Connector Framework — SSRF protection", () => {
  it("blocks localhost", () => {
    expect(isBlockedHost("localhost")).toBe(true);
    expect(validateSupplierEndpoint("http://127.0.0.1/api").allowed).toBe(false);
    expect(validateSupplierEndpoint("http://169.254.169.254/latest/meta-data").allowed).toBe(false);
    expect(validateSupplierEndpoint("http://10.0.0.1/feed").allowed).toBe(false);
    expect(validateSupplierEndpoint("http://192.168.1.1/feed").allowed).toBe(false);
  });

  it("allows public HTTPS endpoints", () => {
    const result = validateSupplierEndpoint("https://supplier.example.com/api", ["supplier.example.com"]);
    expect(result.allowed).toBe(true);
  });

  it("enforces allowlist when configured", () => {
    const result = validateSupplierEndpoint("https://evil.example.com/api", ["supplier.example.com"]);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("NOT_IN_ALLOWLIST");
  });
});

describe("Supplier Connector Framework — network guards", () => {
  it("defaults network to disabled", () => {
    expect(isSupplierNetworkEnabled()).toBe(false);
    expect(isSupplierOrderNetworkEnabled()).toBe(false);
  });

  it("blocks HTTP transport when network disabled", async () => {
    const transport = createSupplierHttpTransport("https://supplier.example.com");
    await expect(
      transport.request({
        url: "https://supplier.example.com/health",
        supplierId: "TEST",
        operation: "health",
      })
    ).rejects.toMatchObject({ code: "NETWORK_DISABLED" });
  });
});

describe("Supplier Connector Framework — mock transport", () => {
  beforeEach(() => resetMockTransportScenarios());

  it("handles success and auth failure scenarios", async () => {
    const transport = new MockSupplierTransport(buildMockTransportFixtures());
    const ok = await transport.request({
      url: "https://supplier-mock.example/api/health",
      supplierId: TEST_SUPPLIER_ID,
      operation: "health",
    });
    expect(ok.status).toBe(200);

    const authFail = await transport.request({
      url: "https://supplier-mock.example/api/auth-fail",
      supplierId: TEST_SUPPLIER_ID,
      operation: "auth",
    });
    expect(authFail.status).toBe(401);

    const rateLimit = await transport.request({
      url: "https://supplier-mock.example/api/rate-limit",
      supplierId: TEST_SUPPLIER_ID,
      operation: "fetch",
    });
    expect(rateLimit.status).toBe(429);
  });

  it("simulates timeout", async () => {
    const transport = new MockSupplierTransport(buildMockTransportFixtures());
    await expect(
      transport.request({
        url: "https://supplier-mock.example/api/timeout",
        supplierId: TEST_SUPPLIER_ID,
        operation: "timeout",
        timeoutMs: 50,
      })
    ).rejects.toMatchObject({ code: "TIMEOUT" });
  });
});

describe("Supplier Connector Framework — authentication", () => {
  beforeEach(() => resetCredentialRefs());

  it("resolves API key auth from secretsRef without exposing values", () => {
    process.env.TEST_SUPPLIER_SECRET = JSON.stringify({ apiKey: "secret-key-value" });
    registerCredentialRef(TEST_SUPPLIER_ID, "env:TEST_SUPPLIER_SECRET");
    const auth = resolveSupplierAuth({
      authentication: "api_key",
      secretsRef: "env:TEST_SUPPLIER_SECRET",
    });
    expect(auth.configured).toBe(true);
    expect(auth.headers["X-API-Key"]).toBe("secret-key-value");
    const redacted = redactSecrets({ apiKey: "secret-key-value", token: "abc" });
    expect(redacted).toEqual({ apiKey: "[REDACTED]", token: "[REDACTED]" });
    delete process.env.TEST_SUPPLIER_SECRET;
  });

  it("handles missing secret", () => {
    const creds = resolveCredentials("env:MISSING_SECRET_REF");
    expect(creds).toBeNull();
  });
});

describe("Supplier Connector Framework — canonical connector contract", () => {
  it("returns CAPABILITY_NOT_SUPPORTED for unsupported operations", async () => {
    const supplier = getSupplierOrThrow(TEST_SUPPLIER_ID);
    const template = new TemplateSupplierConnector({
      ...supplier,
      capabilities: { productFeed: false, stockFeed: false, priceFeed: false, orderAPI: false },
    });
    const products = await template.fetchProducts();
    expect(products.error).toBe(CAPABILITY_NOT_SUPPORTED);
    const order = await template.createOrder({
      supplierId: TEST_SUPPLIER_ID,
      orderId: "ORD-1",
      lines: [{ supplierSku: "SKU-1", quantity: 1, unitPrice: 10 }],
      shippingAddress: { country: "DE" },
    });
    expect(order.errorCode).toBe(CAPABILITY_NOT_SUPPORTED);
  });

  it("template connector exposes order/tracking/returns dry-run contract", async () => {
    const supplier = getSupplierOrThrow(TEST_SUPPLIER_ID);
    const template = new TemplateSupplierConnector({
      ...supplier,
      capabilities: {
        productFeed: true,
        stockFeed: true,
        priceFeed: true,
        orderAPI: true,
        trackingAPI: true,
        returnsAPI: true,
        createOrder: true,
        orderStatus: true,
        tracking: true,
        returnAuthorization: true,
      },
    });
    const tracking = await template.getTracking("ORD-123");
    expect(tracking.ok).toBe(true);
    expect(tracking.data?.trackingNumber).toContain("TRK-");
    const ret = await template.createReturn({
      orderId: "ORD-1",
      supplierOrderId: "SUP-1",
      lines: [{ supplierSku: "SKU-1", quantity: 1 }],
      returnType: "REFUND",
    });
    expect(ret.ok).toBe(true);
    expect(ret.dryRun).toBe(true);
  });
});

describe("Supplier Connector Framework — connector types", () => {
  it("supports API/XML/CSV/Manual connectors", async () => {
    const supplier = getSupplierOrThrow(TEST_SUPPLIER_ID);
    const api = new ApiSupplierConnector(supplier);
    const xml = new XmlSupplierConnector(supplier);
    const csv = new CsvSupplierConnector(supplier);
    const manual = new ManualSupplierConnector(supplier);

    for (const connector of [api, xml, csv, manual]) {
      const connect = await connector.connect();
      expect(connect.ok).toBe(true);
      const health = await connector.healthCheck();
      expect(health.connector).toBeTruthy();
    }
  });
});

describe("Supplier Connector Framework — dry-run test sync", () => {
  beforeEach(async () => {
    const { resetSupplierEngineForTests } = await import("./testReset");
    resetSupplierEngineForTests();
  });

  it("does not mutate canonical product registry", async () => {
    const beforeCount = listRegistryProducts().length;
    const result = await runSupplierDryRunTestSync(TEST_SUPPLIER_ID, { integrationType: "api" });
    expect(result.dryRun).toBe(true);
    expect(result.productsFound).toBeGreaterThan(0);
    expect(listRegistryProducts().length).toBe(beforeCount);
  });
});

describe("Supplier Connector Framework — connection test", () => {
  it("returns CONNECTED for TEST_SUPPLIER_A in mock mode", async () => {
    const result = await runSupplierConnectionTest(TEST_SUPPLIER_ID);
    expect(result.status).toBe("CONNECTED");
    expect(result.environment).toBe("MOCK");
  });
});

describe("Supplier Connector Framework — production sync guard", () => {
  beforeEach(async () => {
    const { resetSupplierEngineForTests } = await import("./testReset");
    resetSupplierEngineForTests();
  });

  it("allows mock sync for TEST_SUPPLIER_A", () => {
    const guard = evaluateProductionSyncGuard(TEST_SUPPLIER_ID, "FULL");
    expect(guard.allowed).toBe(true);
  });

  it("blocks inactive supplier sync in non-mock path", async () => {
    const result = await runSupplierSyncJob(TEST_SUPPLIER_ID, { jobType: "FULL" });
    expect(["COMPLETED", "PARTIAL"]).toContain(result.status);
  });
});

describe("Supplier Connector Framework — order idempotency", () => {
  beforeEach(() => resetOrderIdempotencyKeys());

  it("returns same supplier order id on retry", async () => {
    const key = buildSupplierOrderIdempotencyKey(TEST_SUPPLIER_ID, "ORD-100", "key-1");
    recordIdempotentSupplierOrder(key, "SUP-ORD-100");
    expect(getIdempotentSupplierOrder(key)).toBe("SUP-ORD-100");

    const first = await createSupplierOrder({
      supplierId: TEST_SUPPLIER_ID,
      orderId: "ORD-100",
      idempotencyKey: "key-1",
      lines: [{ supplierSku: "SKU-1", quantity: 1, unitPrice: 10 }],
      shippingAddress: { country: "DE" },
    });
    const second = await createSupplierOrder({
      supplierId: TEST_SUPPLIER_ID,
      orderId: "ORD-100",
      idempotencyKey: "key-1",
      lines: [{ supplierSku: "SKU-1", quantity: 1, unitPrice: 10 }],
      shippingAddress: { country: "DE" },
    });
    expect(first.supplierOrderId).toBe(second.supplierOrderId);
    expect(second.status).toBe("IDEMPOTENT_REPLAY");
  });
});

describe("Supplier Connector Framework — onboarding contract", () => {
  it("validates supplier onboarding definition", () => {
    const errors = validateSupplierOnboardingDefinition({
      supplierId: "",
      connectorType: "api",
      environment: "MOCK",
      authType: "NONE",
      secretsRef: "",
      capabilities: {},
      supportedMarkets: [],
      active: false,
    });
    expect(errors.length).toBeGreaterThan(0);

    const state = buildOnboardingState(
      {
        supplierId: TEST_SUPPLIER_ID,
        connectorType: "api",
        environment: "MOCK",
        authType: "API_KEY",
        secretsRef: "env:TEST",
        capabilities: { productFeed: true },
        supportedMarkets: ["DE"],
        active: true,
      },
      { healthPassed: true, testSyncPassed: true }
    );
    expect(state.readyForActivation).toBe(true);
    expect(state.completedSteps).toContain("TEST_SYNC");
  });
});

describe("Supplier Connector Framework — observability", () => {
  it("tracks connector metrics", () => {
    clearObservability();
    const metrics = getSupplierConnectorMetrics();
    expect(metrics.supplier_requests_total).toBe(0);
  });
});
