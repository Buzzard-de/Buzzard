import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  requestProductionOrderArming,
  approveProductionOrderArming,
  armProductionOrder,
  disarmProductionOrder,
  attemptProductionOrderExecution,
  runProductionArmingPreflight,
  loadOfficialValidationEvidence,
  getProductionArmingDashboard,
  assertArmingSafetyInvariants,
  resetArmingForTests,
  resetArmingSafetyCountersForTests,
  clearArmingAuditForTests,
  getInterCarsSupplierId,
} from "./index";
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
import { resetSupplierEngineForTests } from "@/lib/supplier-engine/testReset";
import { getSupplier } from "@/lib/supplier-engine/registry";

const ORIGINAL_ENV = { ...process.env };

function seedEnv() {
  process.env.SUPPLIER_LIVE_PROFILE = "inter-cars";
  process.env.SUPPLIER_ORDER_NETWORK_ENABLED = "0";
}

function seedUpstreamGates() {
  const supplierId = getInterCarsSupplierId();
  getSupplier(supplierId);

  const readiness = evaluateSupplierOrderReadiness(
    { supplierId, market: "DE", channel: "DIRECT", environment: "PRODUCTION" },
    { force: true, correlationId: "seed343" },
  );
  readiness.overallStatus = "READY";
  readiness.blockers = [];
  saveReadinessRecord(readiness);

  save339Validation({
    validationId: `pval343_${Date.now()}`,
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
    correlationId: "seed343",
    idempotencyKey: `pval343_idem_${Date.now()}`,
    overallStatus: "PASSED",
    checks: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  saveRehearsalRecord({
    rehearsalId: `reh343_${Date.now()}`,
    orderId: "ORD-SEED343",
    supplierId,
    market: "DE",
    channel: "DIRECT",
    environment: "PRODUCTION",
    currentStage: "REHEARSAL_RESULT",
    overallStatus: "PASSED",
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    duration: 100,
    correlationId: "seed343",
    idempotencyKey: `reh343_idem_${Date.now()}`,
    stages: [],
    supplierOrderClassification: "SANDBOX",
    simulatedResponse: true,
    realActivationBlocked: true,
    auditEventCount: 1,
  });

  saveActivationRecord({
    activationId: `act343_${Date.now()}`,
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
    correlationId: "seed343",
    idempotencyKey: `act343_idem_${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

function seedValidatedEvidence() {
  const supplierId = getInterCarsSupplierId();
  const validationId = `cvr343_evidence_${Date.now()}`;
  const capabilityState = promoteCreateOrderCapabilityValidated(true);

  save341Validation({
    validationId,
    supplierId,
    adapterProfile: "inter-cars",
    environment: "PRODUCTION",
    market: "DE",
    channel: "DIRECT",
    orderId: "ORD-VALIDATED-343",
    createOrderCapability: "VALIDATED",
    capabilityState,
    trackingCapability: "UNVERIFIED",
    validationMode: "CONTROLLED_VALIDATION",
    requestPayloadHash: "abc123hash",
    supplierOrderId: "IC-EVIDENCE-001",
    unknownOutcome: false,
    humanReviewRequired: false,
    blockerCodes: [],
    correlationId: "seed343",
    idempotencyKey: `cvr343_idem_${Date.now()}`,
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
    orderReference: "ORD-VALIDATED-343",
    orderId: "ORD-VALIDATED-343",
    market: "DE",
    channel: "DIRECT",
    environment: "PRODUCTION",
    allowedProduct: "test-sku",
    allowedMarket: "DE",
    payloadHash: "abc123hash",
    approvalStatus: "APPROVED",
    preflightPassed: true,
    liveValidation: "PASS",
    createOrderCapability: "VALIDATED",
    capabilityState,
    supplierOrderReference: "IC-EVIDENCE-001",
    unknownOutcome: false,
    humanReviewRequired: false,
    httpCallsMade: 1,
    blockerCodes: [],
    checks: [],
    idempotencyKey: `cvr343_run_${Date.now()}`,
    correlationId: "seed343",
    validationMode: "CONTROLLED_VALIDATION",
    overallStatus: "PASSED",
    approvedBy: "manager@example.com",
    requester: "ops@example.com",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

describe("#343 Inter Cars Production Order Arming", () => {
  beforeEach(() => {
    seedEnv();
    process.env.BUZZARD_SUPPLIER_ORDER_READINESS_PERSISTENCE = "0";
    process.env.BUZZARD_SUPPLIER_PRODUCTION_VALIDATION_PERSISTENCE = "0";
    process.env.BUZZARD_SUPPLIER_ORDER_ACTIVATION_PERSISTENCE = "0";
    process.env.BUZZARD_SUPPLIER_PRODUCTION_ORDER_VALIDATION_PERSISTENCE = "0";
    process.env.BUZZARD_SUPPLIER_PRODUCTION_ORDER_ARMING_PERSISTENCE = "0";
    resetSupplierEngineForTests();
    resetReadinessForTests();
    resetKillSwitchForTests();
    reset339();
    reset341();
    resetRehearsalForTests();
    resetActivationForTests();
    resetArmingForTests();
    resetArmingSafetyCountersForTests();
    clearArmingAuditForTests();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  describe("Default CI safety", () => {
    it("ARMING_BLOCKED without #342 validation evidence", () => {
      seedUpstreamGates();
      const record = requestProductionOrderArming({
        requester: "ops@example.com",
        idempotencyKey: `arm343_blocked_${Date.now()}`,
      });
      expect(record.status).toBe("ARMING_BLOCKED");
      expect(record.blockerCodes).toContain("CREATE_ORDER_UNVERIFIED");
    });

    it("maintains zero real supplier orders", () => {
      const safety = assertArmingSafetyInvariants();
      expect(safety.ok).toBe(true);
    });

    it("ARMED alone does not execute orders", () => {
      seedUpstreamGates();
      seedValidatedEvidence();
      const req = requestProductionOrderArming({
        requester: "ops@example.com",
        idempotencyKey: `arm343_exec_${Date.now()}`,
      });
      expect(req.status).toBe("ARMING_READY");
      approveProductionOrderArming({
        armingId: req.armingId,
        approverId: "manager@example.com",
        requesterId: "ops@example.com",
        scope: req.scope,
        limits: req.limits,
      });
      const armed = armProductionOrder({ armingId: req.armingId, actorId: "manager@example.com" });
      expect(armed.ok).toBe(true);

      const exec = attemptProductionOrderExecution({ armingId: req.armingId, actorId: "manager@example.com" });
      expect(exec.blocked).toBe(true);
      expect(exec.httpCallsMade).toBe(0);
      expect(exec.armed).toBe(true);
    });
  });

  describe("Evidence integrity", () => {
    it("rejects evidence without official validation record", () => {
      const { evidence, blockers } = loadOfficialValidationEvidence({
        supplierId: getInterCarsSupplierId(),
        market: "DE",
        channel: "DIRECT",
        environment: "PRODUCTION",
      });
      expect(evidence).toBeUndefined();
      expect(blockers).toContain("VALIDATION_EVIDENCE_MISSING");
    });

    it("accepts official #342 VALIDATED evidence", () => {
      seedValidatedEvidence();
      const { evidence, blockers } = loadOfficialValidationEvidence({
        supplierId: getInterCarsSupplierId(),
        market: "DE",
        channel: "DIRECT",
        environment: "PRODUCTION",
      });
      expect(blockers.length).toBe(0);
      expect(evidence?.createOrderCapability).toBe("VALIDATED");
      expect(evidence?.supplierOrderReference).toBe("IC-EVIDENCE-001");
    });
  });

  describe("Arming lifecycle", () => {
    it("request → approve → arm → disarm", () => {
      seedUpstreamGates();
      seedValidatedEvidence();
      const record = requestProductionOrderArming({
        requester: "ops@example.com",
        idempotencyKey: `arm343_life_${Date.now()}`,
      });
      expect(record.status).toBe("ARMING_READY");

      const approval = approveProductionOrderArming({
        armingId: record.armingId,
        approverId: "manager@example.com",
        requesterId: "ops@example.com",
        scope: record.scope,
        limits: record.limits,
      });
      expect(approval.ok).toBe(true);

      const armed = armProductionOrder({ armingId: record.armingId, actorId: "manager@example.com" });
      expect(armed.ok).toBe(true);
      expect(armed.record?.status).toBe("ARMED");

      const disarmed = disarmProductionOrder({ armingId: record.armingId, actorId: "manager@example.com" });
      expect(disarmed.ok).toBe(true);
      expect(disarmed.record?.status).toBe("DISARMED");
    });

    it("blocks self-approval", () => {
      seedUpstreamGates();
      seedValidatedEvidence();
      const record = requestProductionOrderArming({
        requester: "ops@example.com",
        idempotencyKey: `arm343_self_${Date.now()}`,
      });
      const approval = approveProductionOrderArming({
        armingId: record.armingId,
        approverId: "ops@example.com",
        requesterId: "ops@example.com",
        scope: record.scope,
        limits: record.limits,
      });
      expect(approval.ok).toBe(false);
      expect(approval.blockers).toContain("SELF_APPROVAL_FORBIDDEN");
    });
  });

  describe("Kill switch", () => {
    it("blocks arming when kill switch active", () => {
      seedUpstreamGates();
      seedValidatedEvidence();
      setGlobalKillSwitch(true, "ops@example.com", "kill-343");
      const record = requestProductionOrderArming({
        requester: "ops@example.com",
        idempotencyKey: `arm343_kill_${Date.now()}`,
      });
      expect(record.status).toBe("ARMING_BLOCKED");
      expect(record.blockerCodes).toContain("KILL_SWITCH_ACTIVE");
    });
  });

  describe("AI boundary", () => {
    it("blocks AI requester", () => {
      const record = requestProductionOrderArming({
        requester: "ai_agent",
        idempotencyKey: `arm343_ai_${Date.now()}`,
      });
      expect(record.status).toBe("ARMING_BLOCKED");
      expect(record.blockerCodes).toContain("AI_BOUNDARY:REQUEST_FORBIDDEN");
    });
  });

  describe("Dashboard", () => {
    it("reports BLOCKED arming without evidence", () => {
      const dash = getProductionArmingDashboard();
      expect(dash.armingState).toBe("ARMING_BLOCKED");
      expect(dash.validationEvidence).toBe("NONE");
      expect(dash.productionOrderNetwork).toBe("OFF");
    });
  });

  describe("Preflight", () => {
    it("includes upstream gate checks", () => {
      seedUpstreamGates();
      const preflight = runProductionArmingPreflight({ requester: "ops@example.com" });
      expect(preflight.checks.some((c) => c.check === "READINESS")).toBe(true);
      expect(preflight.blockers).toContain("CREATE_ORDER_UNVERIFIED");
    });
  });
});
