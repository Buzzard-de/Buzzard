import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  requestFirstProductionOrder,
  approveFirstProductionOrder,
  authorizeFirstProductionOrderExecution,
  executeFirstProductionOrder,
  attemptFirstProductionOrderExecution,
  getFirstProductionOrderDashboard,
  assertFirstOrderSafetyInvariants,
  resetFirstProductionOrderForTests,
  resetFirstOrderSafetyCountersForTests,
  resetAuthorizationForTests,
  resetApprovalNoncesForTests,
  clearFirstOrderAuditForTests,
  getInterCarsSupplierId,
} from "./index";
import {
  requestProductionOrderArming,
  approveProductionOrderArming,
  armProductionOrder,
  resetArmingForTests,
  resetArmingSafetyCountersForTests,
} from "@/lib/supplier-production-order-arming";
import { promoteCreateOrderCapabilityValidated } from "@/lib/supplier-production-order-validation/capabilityUpdate";
import { saveValidationRecord as save341Validation, resetValidationForTests as reset341 } from "@/lib/supplier-production-order-validation/persistence";
import { saveControlledValidationRun } from "@/lib/supplier-production-order-validation/persistence";
import { saveValidationRecord as save339Validation, resetValidationForTests as reset339 } from "@/lib/supplier-production-validation/persistence";
import { saveActivationRecord, resetActivationForTests } from "@/lib/supplier-order-activation/persistence";
import { saveRehearsalRecord, resetRehearsalForTests } from "@/lib/supplier-order-rehearsal/persistence";
import {
  evaluateSupplierOrderReadiness,
  saveReadinessRecord,
  resetReadinessForTests,
  resetKillSwitchForTests,
  setGlobalKillSwitch,
} from "@/lib/supplier-order-readiness";
import { resetOrderIdempotencyKeys } from "@/lib/supplier-engine/orderIdempotency";
import { MockSupplierTransport } from "@/lib/supplier-engine/network/mockTransport";
import { resetSupplierEngineForTests } from "@/lib/supplier-engine/testReset";
import { getSupplier } from "@/lib/supplier-engine/registry";
import { attemptProductionOrderExecution } from "@/lib/supplier-production-order-arming/arm";

const ORIGINAL_ENV = { ...process.env };

function seedEnv() {
  process.env.SUPPLIER_LIVE_PROFILE = "inter-cars";
  process.env.SUPPLIER_ORDER_NETWORK_ENABLED = "0";
  process.env.SUPPLIER_FIRST_PRODUCTION_ORDER_NETWORK = "0";
  process.env.SUPPLIER_FIRST_PRODUCTION_ORDER_MOCK = "0";
  delete process.env.SUPPLIER_FIRST_PRODUCTION_ORDER_MOCK;
}

function seedUpstreamGates() {
  const supplierId = getInterCarsSupplierId();
  getSupplier(supplierId);

  const readiness = evaluateSupplierOrderReadiness(
    { supplierId, market: "DE", channel: "DIRECT", environment: "PRODUCTION" },
    { force: true, correlationId: "seed344" },
  );
  readiness.overallStatus = "READY";
  readiness.blockers = [];
  saveReadinessRecord(readiness);

  save339Validation({
    validationId: `pval344_${Date.now()}`,
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
    correlationId: "seed344",
    idempotencyKey: `pval344_idem_${Date.now()}`,
    overallStatus: "PASSED",
    checks: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  saveRehearsalRecord({
    rehearsalId: `reh344_${Date.now()}`,
    orderId: "ORD-SEED344",
    supplierId,
    market: "DE",
    channel: "DIRECT",
    environment: "PRODUCTION",
    currentStage: "REHEARSAL_RESULT",
    overallStatus: "PASSED",
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    duration: 100,
    correlationId: "seed344",
    idempotencyKey: `reh344_idem_${Date.now()}`,
    stages: [],
    supplierOrderClassification: "SANDBOX",
    simulatedResponse: true,
    realActivationBlocked: true,
    auditEventCount: 1,
  });

  saveActivationRecord({
    activationId: `act344_${Date.now()}`,
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
    correlationId: "seed344",
    idempotencyKey: `act344_idem_${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

function seedValidatedEvidence() {
  const supplierId = getInterCarsSupplierId();
  const validationId = `cvr344_evidence_${Date.now()}`;
  const capabilityState = promoteCreateOrderCapabilityValidated(true);

  save341Validation({
    validationId,
    supplierId,
    adapterProfile: "inter-cars",
    environment: "PRODUCTION",
    market: "DE",
    channel: "DIRECT",
    orderId: "ORD-VALIDATED-344",
    createOrderCapability: "VALIDATED",
    capabilityState,
    trackingCapability: "UNVERIFIED",
    validationMode: "CONTROLLED_VALIDATION",
    requestPayloadHash: "abc123hash344",
    supplierOrderId: "IC-EVIDENCE-344",
    unknownOutcome: false,
    humanReviewRequired: false,
    blockerCodes: [],
    correlationId: "seed344",
    idempotencyKey: `cvr344_idem_${Date.now()}`,
    overallStatus: "PASSED",
    checks: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    controlledValidation: true,
    liveValidation: "PASS",
  });

  saveControlledValidationRun({
    validationId,
    supplier: supplierId,
    orderReference: "ORD-VALIDATED-344",
    orderId: "ORD-VALIDATED-344",
    market: "DE",
    channel: "DIRECT",
    environment: "PRODUCTION",
    allowedProduct: "test-sku",
    allowedMarket: "DE",
    payloadHash: "abc123hash344",
    approvalStatus: "APPROVED",
    preflightPassed: true,
    liveValidation: "PASS",
    createOrderCapability: "VALIDATED",
    capabilityState,
    supplierOrderReference: "IC-EVIDENCE-344",
    unknownOutcome: false,
    humanReviewRequired: false,
    httpCallsMade: 1,
    blockerCodes: [],
    checks: [],
    idempotencyKey: `cvr344_run_${Date.now()}`,
    correlationId: "seed344",
    validationMode: "CONTROLLED_VALIDATION",
    overallStatus: "PASSED",
    approvedBy: "manager@example.com",
    requester: "ops@example.com",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

async function seedArmedState() {
  seedUpstreamGates();
  seedValidatedEvidence();
  const arming = requestProductionOrderArming({
    requester: "ops@example.com",
    idempotencyKey: `arm344_${Date.now()}`,
  });
  approveProductionOrderArming({
    armingId: arming.armingId,
    approverId: "manager@example.com",
    requesterId: "ops@example.com",
    scope: arming.scope,
    limits: arming.limits,
  });
  armProductionOrder({ armingId: arming.armingId, actorId: "manager@example.com" });
  return arming;
}

describe("#344 Controlled First Production Order Execution Gate", () => {
  beforeEach(() => {
    seedEnv();
    process.env.BUZZARD_SUPPLIER_ORDER_READINESS_PERSISTENCE = "0";
    process.env.BUZZARD_SUPPLIER_PRODUCTION_VALIDATION_PERSISTENCE = "0";
    process.env.BUZZARD_SUPPLIER_ORDER_ACTIVATION_PERSISTENCE = "0";
    process.env.BUZZARD_SUPPLIER_PRODUCTION_ORDER_VALIDATION_PERSISTENCE = "0";
    process.env.BUZZARD_SUPPLIER_PRODUCTION_ORDER_ARMING_PERSISTENCE = "0";
    process.env.BUZZARD_SUPPLIER_FIRST_PRODUCTION_ORDER_PERSISTENCE = "0";
    resetSupplierEngineForTests();
    resetReadinessForTests();
    resetKillSwitchForTests();
    reset339();
    reset341();
    resetRehearsalForTests();
    resetActivationForTests();
    resetArmingForTests();
    resetArmingSafetyCountersForTests();
    resetFirstProductionOrderForTests();
    resetFirstOrderSafetyCountersForTests();
    resetAuthorizationForTests();
    resetApprovalNoncesForTests();
    resetOrderIdempotencyKeys();
    clearFirstOrderAuditForTests();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  describe("Default CI safety", () => {
    it("FIRST_ORDER BLOCKED without #342 validation evidence", () => {
      seedUpstreamGates();
      const record = requestFirstProductionOrder({
        requester: "ops@example.com",
        idempotencyKey: `fpo344_blocked_${Date.now()}`,
      });
      expect(record.state).toBe("BLOCKED");
      expect(record.blockerCodes).toContain("CREATE_ORDER_UNVERIFIED");
    });

    it("maintains zero real supplier HTTP calls", () => {
      const safety = assertFirstOrderSafetyInvariants();
      expect(safety.ok).toBe(true);
    });

    it("ARMED alone does not execute via #343 delegation", async () => {
      const arming = await seedArmedState();
      const exec = attemptProductionOrderExecution({ armingId: arming.armingId, actorId: "manager@example.com" });
      expect(exec.blocked).toBe(true);
      expect(exec.httpCallsMade).toBe(0);
      expect(exec.code).toMatch(/EXECUTION_REQUIRES|USE_EXECUTE/);
    });
  });

  describe("Seeded mock success flow", () => {
    it("request → approve → authorize → mock execute → EXECUTED", async () => {
      const arming = await seedArmedState();
      process.env.SUPPLIER_FIRST_PRODUCTION_ORDER_MOCK = "1";

      const record = requestFirstProductionOrder({
        requester: "ops@example.com",
        armingId: arming.armingId,
        idempotencyKey: `fpo344_life_${Date.now()}`,
      });
      expect(record.state).toBe("FIRST_ORDER_READY");

      const approval = approveFirstProductionOrder({
        executionId: record.executionId,
        approverId: "manager@example.com",
        requesterId: "ops@example.com",
        secondaryApproverId: "director@example.com",
      });
      expect(approval.ok).toBe(true);

      const auth = authorizeFirstProductionOrderExecution({
        executionId: record.executionId,
        actorId: "director@example.com",
      });
      expect(auth.ok).toBe(true);

      process.env.SUPPLIER_CONTROLLED_VALIDATION_NETWORK = "1";
      process.env.SUPPLIER_LIVE_CREATE_ORDER_ENABLED = "1";
      const mockTransport = new MockSupplierTransport({
        "POST https://dev.gw.intercars.eu/ic/order/createOrder": {
          status: 200,
          body: JSON.stringify({ orderId: "MOCK-IC-001", status: "accepted" }),
        },
      });
      const result = await executeFirstProductionOrder({
        executionId: record.executionId,
        authorizationId: auth.authorization!.authorizationId,
        actorId: "director@example.com",
        mockTransport,
      });
      expect(result.ok).toBe(true);
      expect(result.state).toBe("EXECUTED");
      expect(result.supplierOrderReference).toBeTruthy();

      const safety = assertFirstOrderSafetyInvariants();
      expect(safety.ok).toBe(true);
    });
  });

  describe("Authorization replay", () => {
    it("blocks authorization replay", async () => {
      const arming = await seedArmedState();
      process.env.SUPPLIER_FIRST_PRODUCTION_ORDER_MOCK = "1";
      process.env.SUPPLIER_LIVE_CREATE_ORDER_ENABLED = "1";

      const record = requestFirstProductionOrder({
        requester: "ops@example.com",
        armingId: arming.armingId,
        idempotencyKey: `fpo344_replay_${Date.now()}`,
      });
      approveFirstProductionOrder({
        executionId: record.executionId,
        approverId: "manager@example.com",
        requesterId: "ops@example.com",
        secondaryApproverId: "director@example.com",
      });
      const auth = authorizeFirstProductionOrderExecution({
        executionId: record.executionId,
        actorId: "director@example.com",
      });
      process.env.SUPPLIER_CONTROLLED_VALIDATION_NETWORK = "1";
      const mockTransport = new MockSupplierTransport({
        "POST https://dev.gw.intercars.eu/ic/order/createOrder": {
          status: 200,
          body: JSON.stringify({ orderId: "MOCK-IC-002", status: "accepted" }),
        },
      });
      await executeFirstProductionOrder({
        executionId: record.executionId,
        authorizationId: auth.authorization!.authorizationId,
        actorId: "director@example.com",
        mockTransport,
      });
      const replay = await executeFirstProductionOrder({
        executionId: record.executionId,
        authorizationId: auth.authorization!.authorizationId,
        actorId: "director@example.com",
        mockTransport,
      });
      expect(replay.blocked).toBe(true);
      expect(replay.blockers.some((b) => ["AUTHORIZATION_REPLAY", "NOT_EXECUTION_AUTHORIZED"].includes(b))).toBe(true);
    });
  });

  describe("Kill switch", () => {
    it("blocks first order when kill switch active", async () => {
      seedUpstreamGates();
      setGlobalKillSwitch(true, "ops@example.com", "kill-344");
      const record = requestFirstProductionOrder({
        requester: "ops@example.com",
        idempotencyKey: `fpo344_kill_${Date.now()}`,
      });
      expect(record.state).toBe("BLOCKED");
      expect(record.blockerCodes).toContain("KILL_SWITCH_ACTIVE");
    });
  });

  describe("AI boundary", () => {
    it("blocks AI requester", () => {
      const record = requestFirstProductionOrder({
        requester: "ai_agent",
        idempotencyKey: `fpo344_ai_${Date.now()}`,
      });
      expect(record.state).toBe("BLOCKED");
      expect(record.blockerCodes).toContain("AI_BOUNDARY:REQUEST_FORBIDDEN");
    });
  });

  describe("Unknown outcome", () => {
    it("creates UNKNOWN_OUTCOME without auto retry", async () => {
      const arming = await seedArmedState();
      process.env.SUPPLIER_FIRST_PRODUCTION_ORDER_MOCK = "1";

      const record = requestFirstProductionOrder({
        requester: "ops@example.com",
        armingId: arming.armingId,
        idempotencyKey: `fpo344_unknown_${Date.now()}`,
      });
      approveFirstProductionOrder({
        executionId: record.executionId,
        approverId: "manager@example.com",
        requesterId: "ops@example.com",
        secondaryApproverId: "director@example.com",
      });
      const auth = authorizeFirstProductionOrderExecution({
        executionId: record.executionId,
        actorId: "director@example.com",
      });
      const result = await executeFirstProductionOrder({
        executionId: record.executionId,
        authorizationId: auth.authorization!.authorizationId,
        actorId: "director@example.com",
        failureInjection: "unknown_outcome",
      });
      expect(result.unknownOutcome).toBe(true);
      expect(result.state).toBe("UNKNOWN_OUTCOME");
    });
  });

  describe("Dashboard", () => {
    it("reports BLOCKED first order without evidence", () => {
      const dash = getFirstProductionOrderDashboard();
      expect(dash.firstOrderState).toBe("BLOCKED");
      expect(dash.validationEvidence).toBe("NONE");
      expect(dash.productionOrderNetwork).toBe("OFF");
      expect(dash.realSupplierHttpCalls).toBe(0);
    });
  });

  describe("Self approval", () => {
    it("blocks self-approval for first order", async () => {
      const arming = await seedArmedState();
      const record = requestFirstProductionOrder({
        requester: "ops@example.com",
        armingId: arming.armingId,
        idempotencyKey: `fpo344_self_${Date.now()}`,
      });
      const approval = approveFirstProductionOrder({
        executionId: record.executionId,
        approverId: "ops@example.com",
        requesterId: "ops@example.com",
      });
      expect(approval.ok).toBe(false);
      expect(approval.blockers).toContain("SELF_APPROVAL_FORBIDDEN");
    });
  });
});
