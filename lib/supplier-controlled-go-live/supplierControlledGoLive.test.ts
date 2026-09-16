import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  requestGoLiveReview,
  approveControlledGoLive,
  activateControlledGoLive,
  rollbackControlledGoLive,
  getControlledGoLiveDashboard,
  assertGoLiveSafetyInvariants,
  resetControlledGoLiveForTests,
  resetGoLiveSafetyCountersForTests,
  resetGoLiveApprovalForTests,
  clearGoLiveAuditForTests,
  getInterCarsSupplierId,
  isControlledGoLiveActive,
} from "./index";
import {
  requestFirstProductionOrder,
  approveFirstProductionOrder,
  authorizeFirstProductionOrderExecution,
  executeFirstProductionOrder,
  resetFirstProductionOrderForTests,
  resetFirstOrderSafetyCountersForTests,
  resetAuthorizationForTests,
  resetApprovalNoncesForTests as resetFirstOrderApprovalNonces,
} from "@/lib/supplier-first-production-order";
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
} from "@/lib/supplier-order-readiness";
import { resetOrderIdempotencyKeys } from "@/lib/supplier-engine/orderIdempotency";
import { MockSupplierTransport } from "@/lib/supplier-engine/network/mockTransport";
import { resetSupplierEngineForTests } from "@/lib/supplier-engine/testReset";
import { getSupplier } from "@/lib/supplier-engine/registry";

const ORIGINAL_ENV = { ...process.env };

function seedEnv() {
  process.env.SUPPLIER_LIVE_PROFILE = "inter-cars";
  process.env.SUPPLIER_ORDER_NETWORK_ENABLED = "0";
  process.env.SUPPLIER_FIRST_PRODUCTION_ORDER_NETWORK = "0";
  process.env.SUPPLIER_GO_LIVE_MOCK = "0";
  delete process.env.SUPPLIER_FIRST_PRODUCTION_ORDER_MOCK;
  delete process.env.SUPPLIER_GO_LIVE_MOCK;
}

function seedUpstreamGates() {
  const supplierId = getInterCarsSupplierId();
  getSupplier(supplierId);

  const readiness = evaluateSupplierOrderReadiness(
    { supplierId, market: "DE", channel: "DIRECT", environment: "PRODUCTION" },
    { force: true, correlationId: "seed345" },
  );
  readiness.overallStatus = "READY";
  readiness.blockers = [];
  saveReadinessRecord(readiness);

  save339Validation({
    validationId: `pval345_${Date.now()}`,
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
    correlationId: "seed345",
    idempotencyKey: `pval345_idem_${Date.now()}`,
    overallStatus: "PASSED",
    checks: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  saveRehearsalRecord({
    rehearsalId: `reh345_${Date.now()}`,
    orderId: "ORD-SEED345",
    supplierId,
    market: "DE",
    channel: "DIRECT",
    environment: "PRODUCTION",
    currentStage: "REHEARSAL_RESULT",
    overallStatus: "PASSED",
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    duration: 100,
    correlationId: "seed345",
    idempotencyKey: `reh345_idem_${Date.now()}`,
    stages: [],
    supplierOrderClassification: "SANDBOX",
    simulatedResponse: true,
    realActivationBlocked: true,
    auditEventCount: 1,
  });

  saveActivationRecord({
    activationId: `act345_${Date.now()}`,
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
    correlationId: "seed345",
    idempotencyKey: `act345_idem_${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

function seedValidatedEvidence() {
  const supplierId = getInterCarsSupplierId();
  const validationId = `cvr345_evidence_${Date.now()}`;
  const capabilityState = promoteCreateOrderCapabilityValidated(true);

  save341Validation({
    validationId,
    supplierId,
    adapterProfile: "inter-cars",
    environment: "PRODUCTION",
    market: "DE",
    channel: "DIRECT",
    orderId: "ORD-VALIDATED-345",
    createOrderCapability: "VALIDATED",
    capabilityState,
    trackingCapability: "UNVERIFIED",
    validationMode: "CONTROLLED_VALIDATION",
    requestPayloadHash: "abc123hash345",
    supplierOrderId: "IC-EVIDENCE-345",
    unknownOutcome: false,
    humanReviewRequired: false,
    blockerCodes: [],
    correlationId: "seed345",
    idempotencyKey: `cvr345_idem_${Date.now()}`,
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
    orderReference: "ORD-VALIDATED-345",
    orderId: "ORD-VALIDATED-345",
    market: "DE",
    channel: "DIRECT",
    environment: "PRODUCTION",
    allowedProduct: "test-sku",
    allowedMarket: "DE",
    payloadHash: "abc123hash345",
    approvalStatus: "APPROVED",
    preflightPassed: true,
    liveValidation: "PASS",
    createOrderCapability: "VALIDATED",
    capabilityState,
    supplierOrderReference: "IC-EVIDENCE-345",
    unknownOutcome: false,
    humanReviewRequired: false,
    httpCallsMade: 1,
    blockerCodes: [],
    checks: [],
    idempotencyKey: `cvr345_run_${Date.now()}`,
    correlationId: "seed345",
    validationMode: "CONTROLLED_VALIDATION",
    overallStatus: "PASSED",
    approvedBy: "manager@example.com",
    requester: "ops@example.com",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

async function seedExecutedFirstOrder() {
  seedUpstreamGates();
  seedValidatedEvidence();
  const arming = requestProductionOrderArming({
    requester: "ops@example.com",
    idempotencyKey: `arm345_${Date.now()}`,
  });
  approveProductionOrderArming({
    armingId: arming.armingId,
    approverId: "manager@example.com",
    requesterId: "ops@example.com",
    scope: arming.scope,
    limits: arming.limits,
  });
  armProductionOrder({ armingId: arming.armingId, actorId: "manager@example.com" });

  process.env.SUPPLIER_FIRST_PRODUCTION_ORDER_MOCK = "1";
  process.env.SUPPLIER_CONTROLLED_VALIDATION_NETWORK = "1";
  process.env.SUPPLIER_LIVE_CREATE_ORDER_ENABLED = "1";

  const record = requestFirstProductionOrder({
    requester: "ops@example.com",
    armingId: arming.armingId,
    idempotencyKey: `fpo345_${Date.now()}`,
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
  const mockTransport = new MockSupplierTransport({
    "POST https://dev.gw.intercars.eu/ic/order/createOrder": {
      status: 200,
      body: JSON.stringify({ orderId: "MOCK-IC-345", status: "accepted" }),
    },
  });
  await executeFirstProductionOrder({
    executionId: record.executionId,
    authorizationId: auth.authorization!.authorizationId,
    actorId: "director@example.com",
    mockTransport,
  });
  return record;
}

describe("#345 Controlled Go-Live Gate", () => {
  beforeEach(() => {
    seedEnv();
    process.env.BUZZARD_SUPPLIER_ORDER_READINESS_PERSISTENCE = "0";
    process.env.BUZZARD_SUPPLIER_PRODUCTION_VALIDATION_PERSISTENCE = "0";
    process.env.BUZZARD_SUPPLIER_ORDER_ACTIVATION_PERSISTENCE = "0";
    process.env.BUZZARD_SUPPLIER_PRODUCTION_ORDER_VALIDATION_PERSISTENCE = "0";
    process.env.BUZZARD_SUPPLIER_PRODUCTION_ORDER_ARMING_PERSISTENCE = "0";
    process.env.BUZZARD_SUPPLIER_FIRST_PRODUCTION_ORDER_PERSISTENCE = "0";
    process.env.BUZZARD_SUPPLIER_CONTROLLED_GO_LIVE_PERSISTENCE = "0";
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
    resetFirstOrderApprovalNonces();
    resetOrderIdempotencyKeys();
    resetControlledGoLiveForTests();
    resetGoLiveSafetyCountersForTests();
    resetGoLiveApprovalForTests();
    clearGoLiveAuditForTests();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  describe("Default CI safety", () => {
    it("GO_LIVE BLOCKED without #342 evidence and first order", () => {
      const record = requestGoLiveReview({
        requester: "ops@example.com",
        idempotencyKey: `cgl345_blocked_${Date.now()}`,
      });
      expect(record.state).toBe("BLOCKED");
      expect(record.blockerCodes).toContain("CREATE_ORDER_UNVERIFIED");
    });

    it("maintains zero real supplier HTTP calls", () => {
      expect(assertGoLiveSafetyInvariants().ok).toBe(true);
    });

    it("CONTROLLED_GO_LIVE does not enable global network", async () => {
      const firstOrder = await seedExecutedFirstOrder();
      process.env.SUPPLIER_GO_LIVE_MOCK = "1";
      const review = requestGoLiveReview({
        requester: "ops@example.com",
        executionId: firstOrder.executionId,
        mockReview: true,
        idempotencyKey: `cgl345_net_${Date.now()}`,
      });
      expect(review.state).toBe("GO_LIVE_REVIEW_READY");
      approveControlledGoLive({
        goLiveId: review.goLiveId,
        approverId: "manager@example.com",
        requesterId: "ops@example.com",
        secondaryApproverId: "director@example.com",
      });
      const activated = activateControlledGoLive({
        goLiveId: review.goLiveId,
        actorId: "director@example.com",
      });
      expect(activated.ok).toBe(true);
      expect(process.env.SUPPLIER_ORDER_NETWORK_ENABLED).toBe("0");
      expect(isControlledGoLiveActive()).toBe(true);
    });
  });

  describe("Mock end-to-end", () => {
    it("review → approve → activate CONTROLLED_GO_LIVE", async () => {
      const firstOrder = await seedExecutedFirstOrder();
      process.env.SUPPLIER_GO_LIVE_MOCK = "1";

      const review = requestGoLiveReview({
        requester: "ops@example.com",
        executionId: firstOrder.executionId,
        mockReview: true,
        idempotencyKey: `cgl345_e2e_${Date.now()}`,
      });
      expect(review.state).toBe("GO_LIVE_REVIEW_READY");
      expect(review.firstOrderEvidence?.mockExecution).toBe(true);

      const approval = approveControlledGoLive({
        goLiveId: review.goLiveId,
        approverId: "manager@example.com",
        requesterId: "ops@example.com",
        secondaryApproverId: "director@example.com",
      });
      expect(approval.ok).toBe(true);

      const activated = activateControlledGoLive({
        goLiveId: review.goLiveId,
        actorId: "director@example.com",
      });
      expect(activated.ok).toBe(true);
      expect(activated.record?.state).toBe("CONTROLLED_GO_LIVE");

      const safety = assertGoLiveSafetyInvariants();
      expect(safety.ok).toBe(true);
    });

    it("rollback stops controlled go-live", async () => {
      const firstOrder = await seedExecutedFirstOrder();
      process.env.SUPPLIER_GO_LIVE_MOCK = "1";
      const review = requestGoLiveReview({
        requester: "ops@example.com",
        executionId: firstOrder.executionId,
        mockReview: true,
        idempotencyKey: `cgl345_rb_${Date.now()}`,
      });
      approveControlledGoLive({
        goLiveId: review.goLiveId,
        approverId: "manager@example.com",
        requesterId: "ops@example.com",
        secondaryApproverId: "director@example.com",
      });
      activateControlledGoLive({ goLiveId: review.goLiveId, actorId: "director@example.com" });

      const rolled = rollbackControlledGoLive({
        goLiveId: review.goLiveId,
        actorId: "director@example.com",
        reason: "TEST_ROLLBACK",
      });
      expect(rolled.ok).toBe(true);
      expect(rolled.record?.state).toBe("ROLLED_BACK");
      expect(isControlledGoLiveActive()).toBe(false);
    });
  });

  describe("Unknown outcome", () => {
    it("blocks go-live when first order has UNKNOWN_OUTCOME", async () => {
      seedUpstreamGates();
      seedValidatedEvidence();
      const arming = requestProductionOrderArming({
        requester: "ops@example.com",
        idempotencyKey: `arm345_uo_${Date.now()}`,
      });
      approveProductionOrderArming({
        armingId: arming.armingId,
        approverId: "manager@example.com",
        requesterId: "ops@example.com",
        scope: arming.scope,
        limits: arming.limits,
      });
      armProductionOrder({ armingId: arming.armingId, actorId: "manager@example.com" });

      process.env.SUPPLIER_FIRST_PRODUCTION_ORDER_MOCK = "1";
      const record = requestFirstProductionOrder({
        requester: "ops@example.com",
        armingId: arming.armingId,
        idempotencyKey: `fpo345_uo_${Date.now()}`,
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
      await executeFirstProductionOrder({
        executionId: record.executionId,
        authorizationId: auth.authorization!.authorizationId,
        actorId: "director@example.com",
        failureInjection: "unknown_outcome",
      });

      const review = requestGoLiveReview({
        requester: "ops@example.com",
        executionId: record.executionId,
        idempotencyKey: `cgl345_uo_${Date.now()}`,
      });
      expect(review.state).toBe("UNKNOWN_OUTCOME");
    });
  });

  describe("AI boundary", () => {
    it("blocks AI requester", () => {
      const record = requestGoLiveReview({
        requester: "ai_agent",
        idempotencyKey: `cgl345_ai_${Date.now()}`,
      });
      expect(record.state).toBe("BLOCKED");
      expect(record.blockerCodes).toContain("AI_BOUNDARY:REQUEST_FORBIDDEN");
    });
  });

  describe("Dashboard", () => {
    it("reports BLOCKED go-live without evidence", () => {
      const dash = getControlledGoLiveDashboard();
      expect(dash.controlledGoLive).toBe("BLOCKED");
      expect(dash.liveValidation).toBe("NONE");
      expect(dash.productionNetwork).toBe("OFF");
      expect(dash.realSupplierHttpCalls).toBe(0);
    });
  });
});
