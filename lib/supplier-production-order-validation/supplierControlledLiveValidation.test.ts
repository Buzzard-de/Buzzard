import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  startControlledValidationRun,
  requestControlledValidationApproval,
  resolveControlledUnknownOutcome,
  assertCreateOrderValidationSafetyInvariants,
  resetCreateOrderValidationSafetyCountersForTests,
  resetValidationForTests,
  resetValidationIdempotencyForTests,
  resetControlledValidationApprovalsForTests,
  getCreateOrderValidationDashboard,
  getCreateOrderValidationSafetyCounters,
  getInterCarsSupplierId,
  deriveCreateOrderCapabilityStatus,
  promoteCreateOrderCapabilityValidated,
} from "./index";
import { MockSupplierTransport } from "@/lib/supplier-engine/network/mockTransport";
import { createOrder, buildSingleItemOrderInput, clearOrderRegistry, seedOrderEngineFixtures } from "@/lib/order-engine";
import { resetSupplierEngineForTests } from "@/lib/supplier-engine/testReset";
import {
  evaluateSupplierOrderReadiness,
  saveReadinessRecord,
  resetReadinessForTests,
  resetKillSwitchForTests,
  setGlobalKillSwitch,
} from "@/lib/supplier-order-readiness";
import { saveValidationRecord as save339Validation, resetValidationForTests as reset339 } from "@/lib/supplier-production-validation/persistence";
import { saveRehearsalRecord, resetRehearsalForTests } from "@/lib/supplier-order-rehearsal/persistence";
import { saveActivationRecord, resetActivationForTests } from "@/lib/supplier-order-activation/persistence";
import { getSupplier } from "@/lib/supplier-engine/registry";

const ORIGINAL_ENV = { ...process.env };

const TEST_CREDENTIAL = JSON.stringify({
  accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0In0.sig",
});

function seedBaseEnv() {
  process.env.SUPPLIER_LIVE_PROFILE = "inter-cars";
  process.env.SUPPLIER_ORDER_NETWORK_ENABLED = "0";
  process.env.SUPPLIER_CONTROLLED_VALIDATION_NETWORK = "0";
  process.env.SUPPLIER_CREATE_ORDER_VALIDATION_ENABLED = "0";
  process.env.SUPPLIER_CREATE_ORDER_VALIDATION_MODE = "MOCK";
  delete process.env.SUPPLIER_LIVE_CREDENTIALS;
  delete process.env.SUPPLIER_LIVE_CREATE_ORDER_ENABLED;
}

function seedUpstreamGates() {
  const supplierId = getInterCarsSupplierId();
  getSupplier(supplierId);

  const readiness = evaluateSupplierOrderReadiness(
    { supplierId, market: "DE", channel: "DIRECT", environment: "PRODUCTION" },
    { force: true, correlationId: "seed342" },
  );
  readiness.overallStatus = "READY";
  readiness.blockers = [];
  saveReadinessRecord(readiness);

  save339Validation({
    validationId: `pval342_${Date.now()}`,
    supplierId,
    adapterProfile: "inter-cars",
    environment: "PRODUCTION",
    market: "DE",
    channel: "DIRECT",
    credentialStatus: "CONFIGURED",
    credentialType: "oauth",
    healthStatus: "LIVE_READ_VALIDATED",
    catalogReadStatus: "LIVE_READ_VALIDATED",
    stockReadStatus: "LIVE_READ_VALIDATED",
    priceReadStatus: "LIVE_READ_VALIDATED",
    createOrderCapability: "UNVERIFIED",
    orderStatusCapability: "UNVERIFIED",
    trackingCapability: "UNVERIFIED",
    returnCapability: "UNVERIFIED",
    refundCapability: "UNVERIFIED",
    dropshippingCapability: "DECLARED",
    blindShippingCapability: "DECLARED",
    whiteLabelCapability: "DECLARED",
    capabilityVersion: "339",
    riskLevel: "LOW",
    readinessStatus: "READY",
    blockerCodes: [],
    correlationId: "seed342",
    idempotencyKey: `pval342_idem_${Date.now()}`,
    overallStatus: "PASSED",
    checks: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  saveRehearsalRecord({
    rehearsalId: `reh342_${Date.now()}`,
    orderId: "ORD-SEED342",
    supplierId,
    market: "DE",
    channel: "DIRECT",
    environment: "PRODUCTION",
    currentStage: "REHEARSAL_RESULT",
    overallStatus: "PASSED",
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    duration: 100,
    correlationId: "seed342",
    idempotencyKey: `reh342_idem_${Date.now()}`,
    stages: [],
    supplierOrderClassification: "SANDBOX",
    simulatedResponse: true,
    realActivationBlocked: true,
    auditEventCount: 1,
  });

  saveActivationRecord({
    activationId: `act342_${Date.now()}`,
    supplierId,
    adapterProfile: "inter-cars",
    market: "DE",
    channel: "DIRECT",
    environment: "PRODUCTION",
    status: "APPROVED",
    networkState: "DISABLED",
    realOrderSent: false,
    requestedBy: "ops@example.com",
    approvedBy: "manager@example.com",
    riskLevel: "LOW",
    correlationId: "seed342",
    idempotencyKey: `act342_idem_${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

describe("#342 Controlled Inter Cars Live Validation Run", () => {
  beforeEach(() => {
    seedBaseEnv();
    process.env.BUZZARD_SUPPLIER_ORDER_READINESS_PERSISTENCE = "0";
    process.env.BUZZARD_SUPPLIER_PRODUCTION_VALIDATION_PERSISTENCE = "0";
    process.env.BUZZARD_SUPPLIER_ORDER_ACTIVATION_PERSISTENCE = "0";
    process.env.BUZZARD_SUPPLIER_PRODUCTION_ORDER_VALIDATION_PERSISTENCE = "0";
    resetSupplierEngineForTests();
    resetReadinessForTests();
    resetKillSwitchForTests();
    reset339();
    resetRehearsalForTests();
    resetActivationForTests();
    resetValidationForTests();
    resetValidationIdempotencyForTests();
    resetControlledValidationApprovalsForTests();
    resetCreateOrderValidationSafetyCountersForTests();
    clearOrderRegistry();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  describe("Default CI safety", () => {
    it("BLOCKED without credentials — LIVE_VALIDATION blocked, UNVERIFIED", async () => {
      const result = await startControlledValidationRun({
        validationId: `cvr342_blocked_${Date.now()}`,
        requester: "ops@example.com",
        approver: "manager@example.com",
      });
      expect(result.run.liveValidation).toBe("BLOCKED");
      expect(result.run.createOrderCapability).toBe("UNVERIFIED");
      expect(result.httpCallsMade).toBe(0);
      expect(getCreateOrderValidationSafetyCounters().realSupplierOrderCalls).toBe(0);
    });

    it("maintains zero real supplier order calls invariant", () => {
      const safety = assertCreateOrderValidationSafetyInvariants();
      expect(safety.ok).toBe(true);
    });
  });

  describe("Controlled validation mode gate", () => {
    it("BLOCKED when controlled validation not enabled", async () => {
      seedUpstreamGates();
      process.env.SUPPLIER_LIVE_CREDENTIALS = TEST_CREDENTIAL;
      process.env.SUPPLIER_CONTROLLED_VALIDATION_NETWORK = "1";
      process.env.SUPPLIER_CREATE_ORDER_VALIDATION_MODE = "CONTROLLED_VALIDATION";

      const result = await startControlledValidationRun({
        validationId: `cvr342_mode_${Date.now()}`,
        requester: "ops@example.com",
        approver: "manager@example.com",
        orderId: "ORD-X",
      });
      expect(result.run.blockerCodes).toContain("CONTROLLED_VALIDATION_MODE_DISABLED");
      expect(result.httpCallsMade).toBe(0);
    });
  });

  describe("Preflight blockers", () => {
    it("BLOCKED on kill switch", async () => {
      seedUpstreamGates();
      setGlobalKillSwitch(true, "ops@example.com", "kill-test-342");
      process.env.SUPPLIER_LIVE_CREDENTIALS = TEST_CREDENTIAL;
      process.env.SUPPLIER_CONTROLLED_VALIDATION_NETWORK = "1";
      process.env.SUPPLIER_CREATE_ORDER_VALIDATION_ENABLED = "1";
      process.env.SUPPLIER_CREATE_ORDER_VALIDATION_MODE = "CONTROLLED_VALIDATION";
      process.env.SUPPLIER_LIVE_CREATE_ORDER_ENABLED = "1";

      const result = await startControlledValidationRun({
        validationId: `cvr342_kill_${Date.now()}`,
        requester: "ops@example.com",
        approver: "manager@example.com",
      });
      expect(result.run.blockerCodes).toContain("KILL_SWITCH_ACTIVE");
      expect(result.httpCallsMade).toBe(0);
    });

    it("BLOCKED on AI requester", async () => {
      process.env.SUPPLIER_CREATE_ORDER_VALIDATION_ENABLED = "1";
      process.env.SUPPLIER_CREATE_ORDER_VALIDATION_MODE = "CONTROLLED_VALIDATION";
      process.env.SUPPLIER_CONTROLLED_VALIDATION_NETWORK = "1";
      const result = await startControlledValidationRun({
        validationId: `cvr342_ai_${Date.now()}`,
        requester: "ai_agent",
        approver: "manager@example.com",
      });
      expect(result.run.blockerCodes).toContain("AI_BOUNDARY:REQUEST_FORBIDDEN");
    });
  });

  describe("Mock controlled validation success", () => {
    it("VALIDATED after mock HTTP success with all gates", async () => {
      seedUpstreamGates();
      seedOrderEngineFixtures();
      const orderResult = await createOrder(
        buildSingleItemOrderInput("reifen-pilot-sport", { idempotencyKey: `cvr342_ord_${Date.now()}` }),
      );
      expect(orderResult.ok).toBe(true);
      const orderId = orderResult.order!.orderId;
      const hasInterCars = orderResult.order!.supplierAssignments.some(
        (a) => a.supplierId === getInterCarsSupplierId(),
      );
      if (!hasInterCars) return;

      process.env.SUPPLIER_LIVE_CREDENTIALS = TEST_CREDENTIAL;
      process.env.SUPPLIER_CONTROLLED_VALIDATION_NETWORK = "1";
      process.env.SUPPLIER_CREATE_ORDER_VALIDATION_ENABLED = "1";
      process.env.SUPPLIER_CREATE_ORDER_VALIDATION_MODE = "CONTROLLED_VALIDATION";
      process.env.SUPPLIER_LIVE_CREATE_ORDER_ENABLED = "1";

      const validationId = `cvr342_success_${Date.now()}`;
      const line = orderResult.order!.items.find((i) => i.supplierId === getInterCarsSupplierId());
      const allowedProduct = line?.sku || "reifen-pilot-sport";

      const { approval, blockers: approvalBlockers } = requestControlledValidationApproval({
        validationId,
        orderId,
        allowedProduct,
        allowedMarket: "DE",
        approvedBy: "manager@example.com",
        requester: "ops@example.com",
      });
      expect(approvalBlockers.length).toBe(0);

      const transport = new MockSupplierTransport({
        "POST https://dev.gw.intercars.eu/ic/order/createOrder": {
          status: 200,
          body: JSON.stringify({ orderId: "IC-CONTROLLED-001", status: "accepted" }),
        },
      });

      const result = await startControlledValidationRun({
        validationId,
        orderId,
        allowedProduct,
        allowedMarket: "DE",
        requester: "ops@example.com",
        approver: "manager@example.com",
        humanConfirmation: true,
        confirmationNonce: approval.confirmationNonce,
        transport,
        idempotencyKey: `cvr342_idem_${Date.now()}`,
      });

      expect(result.run.liveValidation).toBe("PASS");
      expect(result.run.createOrderCapability).toBe("VALIDATED");
      expect(result.run.supplierOrderReference).toBe("IC-CONTROLLED-001");
      expect(result.httpCallsMade).toBe(1);
      expect(getCreateOrderValidationSafetyCounters().realSupplierOrderCalls).toBe(0);
      expect(process.env.SUPPLIER_ORDER_NETWORK_ENABLED).toBe("0");
    });
  });

  describe("Unknown outcome", () => {
    it("does not retry on timeout — HUMAN_REVIEW_REQUIRED", async () => {
      seedUpstreamGates();
      seedOrderEngineFixtures();
      const orderResult = await createOrder(
        buildSingleItemOrderInput("reifen-pilot-sport", { idempotencyKey: `cvr342_to_${Date.now()}` }),
      );
      if (!orderResult.ok) return;
      const hasInterCars = orderResult.order!.supplierAssignments.some(
        (a) => a.supplierId === getInterCarsSupplierId(),
      );
      if (!hasInterCars) return;

      process.env.SUPPLIER_LIVE_CREDENTIALS = TEST_CREDENTIAL;
      process.env.SUPPLIER_CONTROLLED_VALIDATION_NETWORK = "1";
      process.env.SUPPLIER_CREATE_ORDER_VALIDATION_ENABLED = "1";
      process.env.SUPPLIER_CREATE_ORDER_VALIDATION_MODE = "CONTROLLED_VALIDATION";
      process.env.SUPPLIER_LIVE_CREATE_ORDER_ENABLED = "1";

      const validationId = `cvr342_timeout_${Date.now()}`;
      const line = orderResult.order!.items[0];
      const { approval } = requestControlledValidationApproval({
        validationId,
        orderId: orderResult.order!.orderId,
        allowedProduct: line.sku,
        allowedMarket: "DE",
        approvedBy: "manager@example.com",
        requester: "ops@example.com",
      });

      const transport = new MockSupplierTransport({
        "POST https://dev.gw.intercars.eu/ic/order/createOrder": { status: 200, timeout: true },
      });

      const result = await startControlledValidationRun({
        validationId,
        orderId: orderResult.order!.orderId,
        allowedProduct: line.sku,
        allowedMarket: "DE",
        requester: "ops@example.com",
        approver: "manager@example.com",
        humanConfirmation: true,
        confirmationNonce: approval.confirmationNonce,
        transport,
        idempotencyKey: `cvr342_to_idem_${Date.now()}`,
      });

      expect(result.run.unknownOutcome).toBe(true);
      expect(result.run.createOrderCapability).toBe("UNVERIFIED");
      const resolved = resolveControlledUnknownOutcome({
        validationId,
        orderId: orderResult.order!.orderId,
        idempotencyKey: result.run.idempotencyKey,
      });
      expect(resolved.outcome).toBe("HUMAN_REVIEW_REQUIRED");
    });
  });

  describe("Concurrency", () => {
    it("deduplicates parallel runs by idempotency key", async () => {
      const idempotencyKey = `cvr342_par_${Date.now()}`;
      const p1 = startControlledValidationRun({
        validationId: `cvr342_p1_${Date.now()}`,
        requester: "ops@example.com",
        idempotencyKey,
      });
      const p2 = startControlledValidationRun({
        validationId: `cvr342_p2_${Date.now()}`,
        requester: "ops@example.com",
        idempotencyKey,
      });
      const [a, b] = await Promise.all([p1, p2]);
      expect(a.run.validationId).toBe(b.run.validationId);
    });
  });

  describe("Capability promotion", () => {
    it("only VALIDATED when productionValidated true", () => {
      expect(deriveCreateOrderCapabilityStatus(promoteCreateOrderCapabilityValidated(false))).toBe("UNVERIFIED");
      expect(deriveCreateOrderCapabilityStatus(promoteCreateOrderCapabilityValidated(true))).toBe("VALIDATED");
    });

    it("never auto-validates from credentials alone", () => {
      process.env.SUPPLIER_LIVE_CREDENTIALS = TEST_CREDENTIAL;
      const dash = getCreateOrderValidationDashboard();
      expect(dash.createOrderCapability).toBe("UNVERIFIED");
    });
  });

  describe("Dashboard", () => {
    it("reports controlled validation network OFF by default", () => {
      const dash = getCreateOrderValidationDashboard();
      expect(dash.controlledValidationNetwork).toBe("OFF");
      expect(dash.productionOrderNetwork).toBe("OFF");
      expect(["NOT_CONFIGURED", "INVALID"]).toContain(dash.credentialsStatus);
    });
  });
});
