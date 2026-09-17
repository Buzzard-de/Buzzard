import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  startObservation,
  pauseObservation,
  evaluateObservationCompletion,
  requestObservationReview,
  requestBroaderRolloutApproval,
  approveBroaderRollout,
  activateBroaderRollout,
  rollbackBroaderRollout,
  getObservationDashboard,
  assertObservationSafetyInvariants,
  resetObservationForTests,
  resetObservationSafetyCountersForTests,
  resetRolloutApprovalForTests,
  clearObservationAuditForTests,
  getInterCarsSupplierId,
  isBroaderRolloutActive,
} from "./index";
import {
  requestGoLiveReview,
  approveControlledGoLive,
  activateControlledGoLive,
  resetControlledGoLiveForTests,
  resetGoLiveSafetyCountersForTests,
  resetGoLiveApprovalForTests,
  clearGoLiveAuditForTests,
} from "@/lib/supplier-controlled-go-live";
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
  process.env.SUPPLIER_OBSERVATION_MOCK = "0";
  delete process.env.SUPPLIER_FIRST_PRODUCTION_ORDER_MOCK;
  delete process.env.SUPPLIER_GO_LIVE_MOCK;
  delete process.env.SUPPLIER_OBSERVATION_MOCK;
}

function seedUpstreamGates() {
  const supplierId = getInterCarsSupplierId();
  getSupplier(supplierId);

  const readiness = evaluateSupplierOrderReadiness(
    { supplierId, market: "DE", channel: "DIRECT", environment: "PRODUCTION" },
    { force: true, correlationId: "seed346" },
  );
  readiness.overallStatus = "READY";
  readiness.blockers = [];
  saveReadinessRecord(readiness);

  save339Validation({
    validationId: `pval346_${Date.now()}`,
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
    correlationId: "seed346",
    idempotencyKey: `pval346_idem_${Date.now()}`,
    overallStatus: "PASSED",
    checks: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  saveRehearsalRecord({
    rehearsalId: `reh346_${Date.now()}`,
    orderId: "ORD-SEED346",
    supplierId,
    market: "DE",
    channel: "DIRECT",
    environment: "PRODUCTION",
    currentStage: "REHEARSAL_RESULT",
    overallStatus: "PASSED",
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    duration: 100,
    correlationId: "seed346",
    idempotencyKey: `reh346_idem_${Date.now()}`,
    stages: [],
    supplierOrderClassification: "SANDBOX",
    simulatedResponse: true,
    realActivationBlocked: true,
    auditEventCount: 1,
  });

  saveActivationRecord({
    activationId: `act346_${Date.now()}`,
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
    correlationId: "seed346",
    idempotencyKey: `act346_idem_${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

function seedValidatedEvidence() {
  const supplierId = getInterCarsSupplierId();
  const validationId = `cvr346_evidence_${Date.now()}`;
  const capabilityState = promoteCreateOrderCapabilityValidated(true);

  save341Validation({
    validationId,
    supplierId,
    adapterProfile: "inter-cars",
    environment: "PRODUCTION",
    market: "DE",
    channel: "DIRECT",
    orderId: "ORD-VALIDATED-346",
    createOrderCapability: "VALIDATED",
    capabilityState,
    trackingCapability: "UNVERIFIED",
    validationMode: "CONTROLLED_VALIDATION",
    requestPayloadHash: "abc123hash346",
    supplierOrderId: "IC-EVIDENCE-346",
    unknownOutcome: false,
    humanReviewRequired: false,
    blockerCodes: [],
    correlationId: "seed346",
    idempotencyKey: `cvr346_idem_${Date.now()}`,
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
    orderReference: "ORD-VALIDATED-346",
    orderId: "ORD-VALIDATED-346",
    market: "DE",
    channel: "DIRECT",
    environment: "PRODUCTION",
    allowedProduct: "test-sku",
    allowedMarket: "DE",
    payloadHash: "abc123hash346",
    approvalStatus: "APPROVED",
    preflightPassed: true,
    liveValidation: "PASS",
    createOrderCapability: "VALIDATED",
    capabilityState,
    supplierOrderReference: "IC-EVIDENCE-346",
    unknownOutcome: false,
    humanReviewRequired: false,
    httpCallsMade: 1,
    blockerCodes: [],
    checks: [],
    idempotencyKey: `cvr346_run_${Date.now()}`,
    correlationId: "seed346",
    validationMode: "CONTROLLED_VALIDATION",
    overallStatus: "PASSED",
    approvedBy: "manager@example.com",
    requester: "ops@example.com",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

async function seedControlledGoLiveActive() {
  seedUpstreamGates();
  seedValidatedEvidence();
  const arming = requestProductionOrderArming({
    requester: "ops@example.com",
    idempotencyKey: `arm346_${Date.now()}`,
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

  const firstOrder = requestFirstProductionOrder({
    requester: "ops@example.com",
    armingId: arming.armingId,
    idempotencyKey: `fpo346_${Date.now()}`,
  });
  approveFirstProductionOrder({
    executionId: firstOrder.executionId,
    approverId: "manager@example.com",
    requesterId: "ops@example.com",
    secondaryApproverId: "director@example.com",
  });
  const auth = authorizeFirstProductionOrderExecution({
    executionId: firstOrder.executionId,
    actorId: "director@example.com",
  });
  const mockTransport = new MockSupplierTransport({
    "POST https://dev.gw.intercars.eu/ic/order/createOrder": {
      status: 200,
      body: JSON.stringify({ orderId: "MOCK-IC-346", status: "accepted" }),
    },
  });
  await executeFirstProductionOrder({
    executionId: firstOrder.executionId,
    authorizationId: auth.authorization!.authorizationId,
    actorId: "director@example.com",
    mockTransport,
  });

  process.env.SUPPLIER_GO_LIVE_MOCK = "1";
  const review = requestGoLiveReview({
    requester: "ops@example.com",
    executionId: firstOrder.executionId,
    mockReview: true,
    idempotencyKey: `cgl346_${Date.now()}`,
  });
  approveControlledGoLive({
    goLiveId: review.goLiveId,
    approverId: "manager@example.com",
    requesterId: "ops@example.com",
    secondaryApproverId: "director@example.com",
  });
  activateControlledGoLive({ goLiveId: review.goLiveId, actorId: "director@example.com" });

  return { firstOrder, goLiveId: review.goLiveId };
}

describe("#346 Go-Live Observation & Broader Rollout", () => {
  beforeEach(() => {
    seedEnv();
    process.env.BUZZARD_SUPPLIER_ORDER_READINESS_PERSISTENCE = "0";
    process.env.BUZZARD_SUPPLIER_PRODUCTION_VALIDATION_PERSISTENCE = "0";
    process.env.BUZZARD_SUPPLIER_ORDER_ACTIVATION_PERSISTENCE = "0";
    process.env.BUZZARD_SUPPLIER_PRODUCTION_ORDER_VALIDATION_PERSISTENCE = "0";
    process.env.BUZZARD_SUPPLIER_PRODUCTION_ORDER_ARMING_PERSISTENCE = "0";
    process.env.BUZZARD_SUPPLIER_FIRST_PRODUCTION_ORDER_PERSISTENCE = "0";
    process.env.BUZZARD_SUPPLIER_CONTROLLED_GO_LIVE_PERSISTENCE = "0";
    process.env.BUZZARD_SUPPLIER_GO_LIVE_OBSERVATION_PERSISTENCE = "0";
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
    resetObservationForTests();
    resetObservationSafetyCountersForTests();
    resetRolloutApprovalForTests();
    clearObservationAuditForTests();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  describe("Default CI safety", () => {
    it("OBSERVATION BLOCKED without upstream gates", () => {
      const record = startObservation({
        requester: "ops@example.com",
        idempotencyKey: `obs346_blocked_${Date.now()}`,
      });
      expect(record.state).toBe("BLOCKED");
      expect(record.blockerCodes).toContain("CREATE_ORDER_UNVERIFIED");
    });

    it("maintains zero real supplier HTTP calls", () => {
      expect(assertObservationSafetyInvariants().ok).toBe(true);
    });

    it("dashboard reports BLOCKED observation and rollout", () => {
      const dash = getObservationDashboard();
      expect(dash.observationState).toBe("BLOCKED");
      expect(dash.broaderRollout).toBe("BLOCKED");
      expect(dash.controlledGoLive).toBe("BLOCKED");
      expect(dash.liveValidation).toBe("NONE");
      expect(dash.productionNetwork).toBe("OFF");
      expect(dash.realSupplierHttpCalls).toBe(0);
    });

    it("blocks AI requester", () => {
      const record = startObservation({
        requester: "ai_agent",
        idempotencyKey: `obs346_ai_${Date.now()}`,
      });
      expect(record.state).toBe("BLOCKED");
      expect(record.blockerCodes).toContain("AI_BOUNDARY:REQUEST_FORBIDDEN");
    });
  });

  describe("Mock end-to-end", () => {
    it("controlled go-live → observation → review → broader rollout", async () => {
      const { goLiveId } = await seedControlledGoLiveActive();

      process.env.SUPPLIER_OBSERVATION_MOCK = "1";
      process.env.SUPPLIER_OBSERVATION_DURATION_MS = "0";
      process.env.SUPPLIER_OBSERVATION_MIN_ORDERS = "1";
      process.env.SUPPLIER_OBSERVATION_THRESHOLDS_CONFIGURED = "1";

      const observation = startObservation({
        requester: "ops@example.com",
        goLiveId,
        mockObservation: true,
        idempotencyKey: `obs346_e2e_${Date.now()}`,
      });
      expect(observation.state).toBe("OBSERVATION_ACTIVE");
      expect(observation.mockObservation).toBe(true);

      const completed = evaluateObservationCompletion(observation.observationId);
      expect(completed.state).toBe("OBSERVATION_COMPLETED");
      expect(completed.metrics.mockMetrics).toBe(true);

      const review = requestObservationReview({
        observationId: observation.observationId,
        requester: "ops@example.com",
      });
      expect(review.state).toBe("OBSERVATION_REVIEW_READY");

      const approvalReq = requestBroaderRolloutApproval({
        observationId: observation.observationId,
        requester: "ops@example.com",
      });
      expect(approvalReq.ok).toBe(true);

      const approval = approveBroaderRollout({
        observationId: observation.observationId,
        rolloutId: approvalReq.rolloutId!,
        approverId: "manager@example.com",
        requesterId: "ops@example.com",
        secondaryApproverId: "director@example.com",
      });
      expect(approval.ok).toBe(true);

      const activated = activateBroaderRollout({
        observationId: observation.observationId,
        rolloutId: approvalReq.rolloutId!,
        actorId: "director@example.com",
      });
      expect(activated.ok).toBe(true);
      expect(activated.record?.state).toBe("BROADER_ROLLOUT_ACTIVE");
      expect(process.env.SUPPLIER_ORDER_NETWORK_ENABLED).toBe("0");
      expect(isBroaderRolloutActive()).toBe(true);

      const safety = assertObservationSafetyInvariants();
      expect(safety.ok).toBe(true);
    });

    it("rollback stops broader rollout", async () => {
      const { goLiveId } = await seedControlledGoLiveActive();
      process.env.SUPPLIER_OBSERVATION_MOCK = "1";
      process.env.SUPPLIER_OBSERVATION_DURATION_MS = "0";
      process.env.SUPPLIER_OBSERVATION_MIN_ORDERS = "1";
      process.env.SUPPLIER_OBSERVATION_THRESHOLDS_CONFIGURED = "1";

      const observation = startObservation({
        requester: "ops@example.com",
        goLiveId,
        mockObservation: true,
        idempotencyKey: `obs346_rb_${Date.now()}`,
      });
      evaluateObservationCompletion(observation.observationId);
      requestObservationReview({ observationId: observation.observationId, requester: "ops@example.com" });
      const approvalReq = requestBroaderRolloutApproval({
        observationId: observation.observationId,
        requester: "ops@example.com",
      });
      approveBroaderRollout({
        observationId: observation.observationId,
        rolloutId: approvalReq.rolloutId!,
        approverId: "manager@example.com",
        requesterId: "ops@example.com",
        secondaryApproverId: "director@example.com",
      });
      activateBroaderRollout({
        observationId: observation.observationId,
        rolloutId: approvalReq.rolloutId!,
        actorId: "director@example.com",
      });

      const rolled = rollbackBroaderRollout({
        rolloutId: approvalReq.rolloutId!,
        actorId: "director@example.com",
        reason: "TEST_ROLLBACK",
      });
      expect(rolled.ok).toBe(true);
      expect(isBroaderRolloutActive()).toBe(false);
    });

    it("pause observation", async () => {
      const { goLiveId } = await seedControlledGoLiveActive();
      process.env.SUPPLIER_OBSERVATION_MOCK = "1";

      const observation = startObservation({
        requester: "ops@example.com",
        goLiveId,
        mockObservation: true,
        idempotencyKey: `obs346_pause_${Date.now()}`,
      });
      const paused = pauseObservation({
        observationId: observation.observationId,
        actorId: "ops@example.com",
      });
      expect(paused.ok).toBe(true);
      expect(paused.record?.state).toBe("PAUSED");
    });
  });
});
