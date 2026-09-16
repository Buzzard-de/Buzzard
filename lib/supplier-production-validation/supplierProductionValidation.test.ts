import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  runProductionCapabilityValidation,
  assertProductionValidationSafetyInvariants,
  resetProductionValidationSafetyCountersForTests,
  resetValidationForTests,
  hydrateValidationFromPersistence,
  getProductionValidationSafetyCounters,
  getProductionValidationDashboard,
  listValidationRecords,
  classifyEndpoint,
  guardHttpMethod,
  blockOrderEndpointAttempt,
  validateEndpointUrl,
  validateProductionCredentials,
  resolveFailureInjection,
  setLiveReadTransportForTests,
  getInterCarsSupplierId,
  VALIDATION_CHANNELS,
} from "./index";
import { resetSupplierEngineForTests } from "@/lib/supplier-engine/testReset";
import { resetReadinessForTests, resetKillSwitchForTests } from "@/lib/supplier-order-readiness";
import { listMarkets } from "@/lib/market-engine/registry";
import { getSupplier } from "@/lib/supplier-engine/registry";

const ORIGINAL_ENV = {
  network: process.env.SUPPLIER_ORDER_NETWORK_ENABLED,
  liveRead: process.env.SUPPLIER_LIVE_READ_ENABLED,
  supplierNetwork: process.env.SUPPLIER_NETWORK_ENABLED,
  liveProfile: process.env.SUPPLIER_LIVE_PROFILE,
  liveCreds: process.env.SUPPLIER_LIVE_CREDENTIALS,
};

function seedInterCarsEnv() {
  process.env.SUPPLIER_LIVE_PROFILE = "inter-cars";
  process.env.SUPPLIER_ORDER_NETWORK_ENABLED = "0";
  process.env.SUPPLIER_NETWORK_ENABLED = "0";
  process.env.SUPPLIER_LIVE_READ_ENABLED = "0";
  delete process.env.SUPPLIER_LIVE_CREDENTIALS;
}

describe("#339 Inter Cars Production Capability Validation", () => {
  beforeEach(() => {
    seedInterCarsEnv();
    resetSupplierEngineForTests();
    resetReadinessForTests();
    resetKillSwitchForTests();
    resetValidationForTests();
    resetProductionValidationSafetyCountersForTests();
    setLiveReadTransportForTests(null);
    getSupplier(getInterCarsSupplierId());
  });

  afterEach(() => {
    if (ORIGINAL_ENV.network === undefined) delete process.env.SUPPLIER_ORDER_NETWORK_ENABLED;
    else process.env.SUPPLIER_ORDER_NETWORK_ENABLED = ORIGINAL_ENV.network;
    if (ORIGINAL_ENV.liveRead === undefined) delete process.env.SUPPLIER_LIVE_READ_ENABLED;
    else process.env.SUPPLIER_LIVE_READ_ENABLED = ORIGINAL_ENV.liveRead;
    if (ORIGINAL_ENV.supplierNetwork === undefined) delete process.env.SUPPLIER_NETWORK_ENABLED;
    else process.env.SUPPLIER_NETWORK_ENABLED = ORIGINAL_ENV.supplierNetwork;
    if (ORIGINAL_ENV.liveProfile === undefined) delete process.env.SUPPLIER_LIVE_PROFILE;
    else process.env.SUPPLIER_LIVE_PROFILE = ORIGINAL_ENV.liveProfile;
    if (ORIGINAL_ENV.liveCreds === undefined) delete process.env.SUPPLIER_LIVE_CREDENTIALS;
    else process.env.SUPPLIER_LIVE_CREDENTIALS = ORIGINAL_ENV.liveCreds;
  });

  describe("Credential validation", () => {
    it("BLOCKED when credential not configured", async () => {
      const result = await runProductionCapabilityValidation({
        requester: "ops@example.com",
        idempotencyKey: `pval_cred_${Date.now()}`,
      });
      expect(result.credentialStatus).toBe("NOT_CONFIGURED");
      expect(result.overallStatus).toBe("BLOCKED");
      expect(result.createOrderCapability).toBe("UNVERIFIED");
      expect(result.blockerCodes).toContain("CREDENTIAL_NOT_CONFIGURED");
    });

    it("BLOCKED for mock credential", async () => {
      process.env.SUPPLIER_LIVE_CREDENTIALS = JSON.stringify({ accessToken: "mock-test-token" });
      resetSupplierEngineForTests();
      getSupplier(getInterCarsSupplierId());
      const result = await runProductionCapabilityValidation({
        requester: "ops@example.com",
        idempotencyKey: `pval_mock_${Date.now()}`,
      });
      expect(result.credentialStatus).toBe("BLOCKED");
      expect(result.blockerCodes).toContain("CREDENTIAL_MOCK");
    });
  });

  describe("Order capability boundary", () => {
    it("always leaves createOrder UNVERIFIED", async () => {
      const result = await runProductionCapabilityValidation({
        requester: "ops@example.com",
        idempotencyKey: `pval_order_${Date.now()}`,
      });
      expect(result.createOrderCapability).toBe("UNVERIFIED");
      expect(result.blockerCodes).toContain("REAL_ORDER_ENDPOINT_NOT_VALIDATED");
    });
  });

  describe("HTTP method guard", () => {
    it("blocks POST to order endpoint without real network call", () => {
      const guard = guardHttpMethod("POST", "/ic/order/createOrder", { correlationId: "test" });
      expect(guard.allowed).toBe(false);
      expect(guard.classification).toBe("ORDER_CREATE");
      const blocked = blockOrderEndpointAttempt("https://gw.intercars.eu/ic/order/createOrder", {
        correlationId: "test",
      });
      expect(blocked.blocked).toBe(true);
      expect(getProductionValidationSafetyCounters().realOrderCalls).toBe(0);
    });

    it("allows GET on catalog endpoint classification", () => {
      expect(classifyEndpoint("/ic/catalog/products")).toBe("CATALOG");
      const guard = guardHttpMethod("GET", "/ic/catalog/products", { correlationId: "test" });
      expect(guard.allowed).toBe(true);
    });
  });

  describe("SSRF / endpoint security", () => {
    it("blocks private IP endpoints", () => {
      const check = validateEndpointUrl("http://127.0.0.1/admin", []);
      expect(check.allowed).toBe(false);
    });

    it("blocks unknown endpoint classification", () => {
      expect(classifyEndpoint("/internal/debug")).toBe("UNKNOWN");
    });
  });

  describe("Failure injection", () => {
    it("blocks at expected stage for environment mismatch", async () => {
      const spec = resolveFailureInjection("ENVIRONMENT_MISMATCH");
      expect(spec?.blockerCode).toBe("ENVIRONMENT_MISMATCH");
      const result = await runProductionCapabilityValidation({
        requester: "ops@example.com",
        failureInjection: "ENVIRONMENT_MISMATCH",
        idempotencyKey: `pval_inj_${Date.now()}`,
      });
      expect(result.overallStatus).toBe("BLOCKED");
    });
  });

  describe("35 markets & channels", () => {
    it("uses 35-market SSOT", () => {
      expect(listMarkets().length).toBe(35);
    });

    it("supports all validation channels", () => {
      expect(VALIDATION_CHANNELS.length).toBe(8);
    });
  });

  describe("Live read (mock transport)", () => {
    it("validates read-only paths with mock transport when enabled", async () => {
      process.env.SUPPLIER_NETWORK_ENABLED = "1";
      process.env.SUPPLIER_LIVE_READ_ENABLED = "1";
      resetSupplierEngineForTests();
      process.env.SUPPLIER_LIVE_CREDENTIALS = JSON.stringify({
        accessToken: "ic-oauth-production-readonly-2026-abc123",
      });
      getSupplier(getInterCarsSupplierId());

      setLiveReadTransportForTests(async () => ({
        ok: true,
        status: 200,
        body: '{"ok":true}',
        contentType: "application/json",
      }));

      const result = await runProductionCapabilityValidation({
        requester: "ops@example.com",
        allowLiveRead: true,
        idempotencyKey: `pval_live_${Date.now()}`,
      });
      expect(result.credentialStatus).toBe("VALID");
      expect(result.catalogReadStatus).toBe("LIVE_READ_VALIDATED");
      expect(getProductionValidationSafetyCounters().realOrderCalls).toBe(0);
    });
  });

  describe("Safety invariants", () => {
    it("maintains zero real order calls", async () => {
      await runProductionCapabilityValidation({
        requester: "ops@example.com",
        idempotencyKey: `pval_safe_${Date.now()}`,
      });
      expect(assertProductionValidationSafetyInvariants().ok).toBe(true);
    });
  });

  describe("Idempotency", () => {
    it("reuses validation for same idempotency key", async () => {
      const key = `pval_idem_${Date.now()}`;
      const a = await runProductionCapabilityValidation({
        requester: "ops@example.com",
        idempotencyKey: key,
      });
      const b = await runProductionCapabilityValidation({
        requester: "ops@example.com",
        idempotencyKey: key,
      });
      expect(b.validationId).toBe(a.validationId);
    });
  });

  describe("Admin dashboard", () => {
    it("returns dashboard with safety counters", async () => {
      await runProductionCapabilityValidation({
        requester: "ops@example.com",
        idempotencyKey: `pval_dash_${Date.now()}`,
      });
      const dash = getProductionValidationDashboard();
      expect(dash.realSupplierOrderNetwork).toBe("DISABLED");
      expect(dash.productionOrderActivation).toBe("NOT ACTIVE");
      expect(dash.safety.realOrderCalls).toBe(0);
    });
  });

  describe("Persistence", () => {
    it.skipIf(!hasPersistentStore())("hydrates from persistence", async () => {
      await runProductionCapabilityValidation({
        requester: "ops@example.com",
        idempotencyKey: `pval_persist_${Date.now()}`,
      });
      resetValidationForTests();
      hydrateValidationFromPersistence();
      expect(listValidationRecords().length).toBeGreaterThan(0);
    });
  });

  describe("Secret redaction", () => {
    it("never exposes token in credential validation checks", () => {
      process.env.SUPPLIER_LIVE_CREDENTIALS = JSON.stringify({ accessToken: "super-secret-token-value" });
      const result = validateProductionCredentials({
        supplierId: getInterCarsSupplierId(),
        environment: "SANDBOX",
      });
      const serialized = JSON.stringify(result);
      expect(serialized).not.toContain("super-secret-token-value");
    });
  });
});

function hasPersistentStore() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createSupplierProductionValidationStore } = require("../../server/lib/supplier-production-validation/persistentStore.js");
    return Boolean(createSupplierProductionValidationStore());
  } catch {
    return false;
  }
}
