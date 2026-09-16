import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  runCreateOrderProductionValidation,
  attemptProductionCreateOrder,
  resolveUnknownOutcome,
  assertCreateOrderValidationSafetyInvariants,
  resetCreateOrderValidationSafetyCountersForTests,
  resetValidationForTests,
  resetValidationIdempotencyForTests,
  getCreateOrderValidationDashboard,
  getCreateOrderValidationSafetyCounters,
  evaluateCreateOrderProductionValidationChecks,
  evaluateDeclaredCapability,
  deriveCreateOrderCapabilityStatus,
  buildCanonicalPayloadFromOrder,
  hashCreateOrderPayload,
  resolveCreateOrderFailureInjection,
  getInterCarsSupplierId,
} from "./index";
import { createOrder, buildSingleItemOrderInput, clearOrderRegistry, seedOrderEngineFixtures } from "@/lib/order-engine";
import { resetSupplierEngineForTests } from "@/lib/supplier-engine/testReset";
import { resetReadinessForTests, resetKillSwitchForTests } from "@/lib/supplier-order-readiness";
import { resetValidationForTests as reset339Validation } from "@/lib/supplier-production-validation/persistence";
import { resetActivationForTests } from "@/lib/supplier-order-activation/persistence";
import { classifyHttpError, parseInterCarsCreateOrderResponse } from "./response";
import { guardHttpMethod, validateEndpointUrl } from "@/lib/supplier-production-validation/endpointSecurity";

const ORIGINAL_ENV = {
  network: process.env.SUPPLIER_ORDER_NETWORK_ENABLED,
  liveProfile: process.env.SUPPLIER_LIVE_PROFILE,
  validationMode: process.env.SUPPLIER_CREATE_ORDER_VALIDATION_MODE,
  validationEnabled: process.env.SUPPLIER_CREATE_ORDER_VALIDATION_ENABLED,
};

function seedEnv() {
  process.env.SUPPLIER_LIVE_PROFILE = "inter-cars";
  process.env.SUPPLIER_ORDER_NETWORK_ENABLED = "0";
  process.env.SUPPLIER_CREATE_ORDER_VALIDATION_MODE = "MOCK";
  process.env.SUPPLIER_CREATE_ORDER_VALIDATION_ENABLED = "0";
  delete process.env.SUPPLIER_LIVE_CREDENTIALS;
}

describe("#341 Inter Cars createOrder Production Validation", () => {
  beforeEach(() => {
    seedEnv();
    resetSupplierEngineForTests();
    resetReadinessForTests();
    resetKillSwitchForTests();
    reset339Validation();
    resetActivationForTests();
    resetValidationForTests();
    resetValidationIdempotencyForTests();
    resetCreateOrderValidationSafetyCountersForTests();
    clearOrderRegistry();
  });

  afterEach(() => {
    if (ORIGINAL_ENV.network === undefined) delete process.env.SUPPLIER_ORDER_NETWORK_ENABLED;
    else process.env.SUPPLIER_ORDER_NETWORK_ENABLED = ORIGINAL_ENV.network;
    if (ORIGINAL_ENV.liveProfile === undefined) delete process.env.SUPPLIER_LIVE_PROFILE;
    else process.env.SUPPLIER_LIVE_PROFILE = ORIGINAL_ENV.liveProfile;
    if (ORIGINAL_ENV.validationMode === undefined) delete process.env.SUPPLIER_CREATE_ORDER_VALIDATION_MODE;
    else process.env.SUPPLIER_CREATE_ORDER_VALIDATION_MODE = ORIGINAL_ENV.validationMode;
    if (ORIGINAL_ENV.validationEnabled === undefined) delete process.env.SUPPLIER_CREATE_ORDER_VALIDATION_ENABLED;
    else process.env.SUPPLIER_CREATE_ORDER_VALIDATION_ENABLED = ORIGINAL_ENV.validationEnabled;
  });

  describe("Capability model", () => {
    it("keeps createOrder UNVERIFIED without production proof", () => {
      const { state } = evaluateDeclaredCapability(getInterCarsSupplierId());
      expect(deriveCreateOrderCapabilityStatus(state)).toBe("UNVERIFIED");
      expect(state.productionValidated).toBe(false);
    });

    it("never auto-promotes UNVERIFIED to VALIDATED from config alone", async () => {
      const result = await runCreateOrderProductionValidation({
        requester: "ops@example.com",
        idempotencyKey: `co341_cap_${Date.now()}`,
      });
      expect(result.createOrderCapability).toBe("UNVERIFIED");
      expect(result.capabilityState.productionValidated).toBe(false);
    });
  });

  describe("Validation pipeline", () => {
    it("BLOCKED without credentials", async () => {
      const result = await runCreateOrderProductionValidation({
        requester: "ops@example.com",
        idempotencyKey: `co341_cred_${Date.now()}`,
      });
      expect(result.overallStatus).toBe("BLOCKED");
      expect(
        result.blockerCodes.includes("CREDENTIAL_NOT_CONFIGURED") ||
          result.blockerCodes.includes("CREATE_ORDER_NOT_DECLARED"),
      ).toBe(true);
      expect(result.createOrderCapability).toBe("UNVERIFIED");
    });

    it("deduplicates by idempotency key", async () => {
      const key = `co341_dup_${Date.now()}`;
      const a = await runCreateOrderProductionValidation({ requester: "ops@example.com", idempotencyKey: key });
      const b = await runCreateOrderProductionValidation({ requester: "ops@example.com", idempotencyKey: key });
      expect(a.validationId).toBe(b.validationId);
    });

    it("blocks AI requester", async () => {
      const result = await runCreateOrderProductionValidation({
        requester: "ai_agent",
        idempotencyKey: `co341_ai_${Date.now()}`,
      });
      expect(result.blockerCodes).toContain("AI_BOUNDARY:REQUEST_FORBIDDEN");
    });
  });

  describe("Order-bound validation", () => {
    it("validates payload from order engine snapshots", async () => {
      seedOrderEngineFixtures();
      const orderResult = await createOrder(
        buildSingleItemOrderInput("reifen-pilot-sport", { idempotencyKey: `co341_ord_${Date.now()}` }),
      );
      expect(orderResult.ok).toBe(true);
      const payload = buildCanonicalPayloadFromOrder(orderResult.order!.orderId);
      const hasInterCars = orderResult.order!.supplierAssignments.some(
        (a) => a.supplierId === getInterCarsSupplierId(),
      );
      if (hasInterCars) {
        expect(payload.blockers.length).toBe(0);
        expect(payload.payloadHash).toBeTruthy();
      } else {
        expect(payload.blockers).toContain("SUPPLIER_ASSIGNMENT_MISMATCH");
      }
    });
  });

  describe("attemptProductionCreateOrder hard block", () => {
    it("always BLOCKED with zero HTTP calls", () => {
      seedOrderEngineFixtures();
      const result = attemptProductionCreateOrder({
        orderId: "ORD-TEST",
        requester: "ops@example.com",
      });
      expect(result.blocked).toBe(true);
      expect(result.code).toBe("REAL_ORDER_ENDPOINT_NOT_VALIDATED");
      expect(result.httpCallsMade).toBe(0);
      expect(getCreateOrderValidationSafetyCounters().realSupplierOrderCalls).toBe(0);
    });
  });

  describe("Response classification", () => {
    it("classifies HTTP errors correctly", () => {
      expect(classifyHttpError(401).responseClass).toBe("authentication_error");
      expect(classifyHttpError(409).responseClass).toBe("duplicate");
      expect(classifyHttpError(429).retryable).toBe(true);
      expect(classifyHttpError(500).retryable).toBe(true);
    });

    it("does not treat HTTP 200 without order ID as accepted", () => {
      const parsed = parseInterCarsCreateOrderResponse({ status: "ok" }, 200);
      expect(parsed.responseClass).not.toBe("accepted");
      expect(parsed.humanReviewRequired).toBe(true);
    });

    it("accepts valid supplier order ID", () => {
      const parsed = parseInterCarsCreateOrderResponse({ orderId: "IC-12345", status: "accepted" }, 200);
      expect(parsed.responseClass).toBe("accepted");
      expect(parsed.supplierOrderId).toBe("IC-12345");
    });
  });

  describe("Unknown outcome", () => {
    it("requires human review when unresolved", () => {
      const outcome = resolveUnknownOutcome({ orderId: "ORD-X", idempotencyKey: "key-x" });
      expect(outcome.outcome).toBe("HUMAN_REVIEW_REQUIRED");
    });
  });

  describe("Failure injection", () => {
    it("blocks at HTTP_401 injection", async () => {
      const result = await runCreateOrderProductionValidation({
        requester: "ops@example.com",
        failureInjection: "HTTP_401",
        idempotencyKey: `co341_inj_${Date.now()}`,
      });
      expect(result.blockerCodes).toContain("HTTP_401");
    });

    it("maps failure injection catalog", () => {
      expect(resolveCreateOrderFailureInjection("UNKNOWN_OUTCOME")?.blockerCode).toBe("UNKNOWN_OUTCOME");
      expect(resolveCreateOrderFailureInjection("PRICE_MISMATCH")?.blockerCode).toBe("PRICE_SNAPSHOT_MISMATCH");
    });
  });

  describe("Security", () => {
    it("blocks private IP endpoints", () => {
      const check = validateEndpointUrl("http://127.0.0.1/order", []);
      expect(check.allowed).toBe(false);
    });

    it("blocks POST to createOrder endpoint", () => {
      const guard = guardHttpMethod("POST", "/ic/order/createOrder", { correlationId: "test" });
      expect(guard.allowed).toBe(false);
    });
  });

  describe("Readiness bridge", () => {
    it("reports CREATE_ORDER_VALIDATION_MISSING when no run", () => {
      const checks = evaluateCreateOrderProductionValidationChecks({
        supplierId: getInterCarsSupplierId(),
        market: "DE",
        channel: "DIRECT",
        environment: "PRODUCTION",
      });
      expect(checks.some((c) => c.code === "CREATE_ORDER_VALIDATION_MISSING")).toBe(true);
    });
  });

  describe("Dashboard & safety", () => {
    it("reports UNVERIFIED and network OFF", () => {
      const dash = getCreateOrderValidationDashboard();
      expect(dash.createOrderCapability).toBe("UNVERIFIED");
      expect(dash.productionOrderNetwork).toBe("OFF");
      expect(dash.realSupplierOrderCalls).toBe(0);
      expect(dash.realCustomerOrders).toBe(0);
    });

    it("maintains zero real call invariants", () => {
      const safety = assertCreateOrderValidationSafetyInvariants();
      expect(safety.ok).toBe(true);
    });
  });

  describe("Payload hash", () => {
    it("is deterministic", () => {
      const a = hashCreateOrderPayload({ b: 2, a: 1 });
      const b = hashCreateOrderPayload({ a: 1, b: 2 });
      expect(a).toBe(b);
    });
  });
});
