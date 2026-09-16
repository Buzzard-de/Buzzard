import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  runActivationPreflight,
  createActivationRequest,
  approveActivationRequest,
  armActivation,
  confirmActivation,
  executeRealSupplierOrder,
  previewFirstOrder,
  prepareFirstOrderGate,
  invalidateFirstOrderOnPayloadChange,
  assertActivationSafetyInvariants,
  resetActivationSafetyCountersForTests,
  resetActivationForTests,
  getActivationSafetyCounters,
  getSupplierOrderActivationDashboard,
  listActivationAudit,
  resolveActivationFailureInjection,
  getInterCarsSupplierId,
  hashPayload,
  saveActivationRecord,
} from "./index";
import { saveRehearsalRecord, resetRehearsalForTests } from "@/lib/supplier-order-rehearsal/persistence";
import { saveValidationRecord, resetValidationForTests } from "@/lib/supplier-production-validation/persistence";
import {
  evaluateSupplierOrderReadiness,
  saveReadinessRecord,
  resetReadinessForTests,
  resetKillSwitchForTests,
  setGlobalKillSwitch,
} from "@/lib/supplier-order-readiness";
import { resetSupplierEngineForTests } from "@/lib/supplier-engine/testReset";
import { resetControlTowerForTests } from "@/lib/fulfillment-control-tower";
import { getSupplier } from "@/lib/supplier-engine/registry";

const ORIGINAL_ENV = {
  network: process.env.SUPPLIER_ORDER_NETWORK_ENABLED,
  liveProfile: process.env.SUPPLIER_LIVE_PROFILE,
};

function seedInterCarsEnv() {
  process.env.SUPPLIER_LIVE_PROFILE = "inter-cars";
  process.env.SUPPLIER_ORDER_NETWORK_ENABLED = "0";
  delete process.env.SUPPLIER_LIVE_CREDENTIALS;
}

function seedActivationFixtures() {
  const supplierId = getInterCarsSupplierId();
  getSupplier(supplierId);

  const readiness = evaluateSupplierOrderReadiness(
    { supplierId, market: "DE", channel: "DIRECT", environment: "PRODUCTION" },
    { force: true, correlationId: "seed" },
  );
  readiness.overallStatus = "READY";
  readiness.blockers = [];
  readiness.riskLevel = "LOW";
  saveReadinessRecord(readiness);

  saveValidationRecord({
    validationId: `pval_seed_${Date.now()}`,
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
    blockerCodes: ["REAL_ORDER_ENDPOINT_NOT_VALIDATED"],
    correlationId: "seed",
    idempotencyKey: `pval_idem_${Date.now()}`,
    overallStatus: "PASSED",
    checks: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  saveRehearsalRecord({
    rehearsalId: `reh_seed_${Date.now()}`,
    orderId: "ORD-SEED",
    supplierId,
    market: "DE",
    channel: "DIRECT",
    environment: "PRODUCTION",
    currentStage: "REHEARSAL_RESULT",
    overallStatus: "PASSED",
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    duration: 100,
    correlationId: "seed",
    idempotencyKey: `reh_idem_${Date.now()}`,
    stages: [],
    supplierOrderClassification: "SANDBOX",
    simulatedResponse: true,
    realActivationBlocked: true,
    auditEventCount: 1,
  });
}

describe("#340 Inter Cars Production Activation Safety Gate", () => {
  beforeEach(() => {
    seedInterCarsEnv();
    process.env.BUZZARD_SUPPLIER_ORDER_READINESS_PERSISTENCE = "0";
    process.env.BUZZARD_SUPPLIER_ORDER_ACTIVATION_PERSISTENCE = "0";
    resetSupplierEngineForTests();
    resetControlTowerForTests();
    resetReadinessForTests();
    resetKillSwitchForTests();
    resetRehearsalForTests();
    resetValidationForTests();
    resetActivationForTests();
    resetActivationSafetyCountersForTests();
  });

  afterEach(() => {
    if (ORIGINAL_ENV.network === undefined) delete process.env.SUPPLIER_ORDER_NETWORK_ENABLED;
    else process.env.SUPPLIER_ORDER_NETWORK_ENABLED = ORIGINAL_ENV.network;
    if (ORIGINAL_ENV.liveProfile === undefined) delete process.env.SUPPLIER_LIVE_PROFILE;
    else process.env.SUPPLIER_LIVE_PROFILE = ORIGINAL_ENV.liveProfile;
  });

  describe("Preflight", () => {
    it("runs all checks and blocks on createOrder UNVERIFIED", () => {
      seedActivationFixtures();
      const result = runActivationPreflight({
        supplierId: getInterCarsSupplierId(),
        market: "DE",
        channel: "DIRECT",
        requester: "ops@example.com",
      });
      expect(result.checks.length).toBeGreaterThanOrEqual(20);
      expect(result.createOrderCapability).toBe("UNVERIFIED");
      expect(result.blockers).toContain("REAL_ORDER_ENDPOINT_NOT_VALIDATED");
    });
  });

  describe("Activation lifecycle", () => {
    it("creates activation request with separate network and real-order state", () => {
      seedActivationFixtures();
      const result = createActivationRequest({
        requester: "ops@example.com",
        idempotencyKey: `act_${Date.now()}`,
      });
      expect(result.activation).toBeDefined();
      expect(result.activation!.networkState).toBe("DISABLED");
      expect(result.activation!.realOrderSent).toBe(false);
      expect(result.blockers).toContain("REAL_ORDER_ENDPOINT_NOT_VALIDATED");
    });

    it("forbids self approval", () => {
      seedActivationFixtures();
      const created = createActivationRequest({
        requester: "ops@example.com",
        idempotencyKey: `act_self_${Date.now()}`,
      });
      if (!created.activation) return;
      created.activation.status = "PENDING_APPROVAL";
      saveActivationRecord(created.activation);
      const approval = approveActivationRequest({
        activationId: created.activation.activationId,
        approverId: "ops@example.com",
      });
      expect(approval.ok).toBe(false);
      if (!approval.ok) {
        expect(approval.blockers).toContain("SELF_APPROVAL_FORBIDDEN");
      }
    });

    it("deduplicates by idempotency key", () => {
      seedActivationFixtures();
      const key = `act_dup_${Date.now()}`;
      const a = createActivationRequest({ requester: "ops@example.com", idempotencyKey: key });
      const b = createActivationRequest({ requester: "ops@example.com", idempotencyKey: key });
      expect(a.activation?.activationId).toBe(b.activation?.activationId);
    });
  });

  describe("executeRealSupplierOrder hard block", () => {
    it("always BLOCKED with REAL_ORDER_ENDPOINT_NOT_VALIDATED and zero HTTP calls", () => {
      seedActivationFixtures();
      const created = createActivationRequest({
        requester: "ops@example.com",
        idempotencyKey: `act_exec_${Date.now()}`,
      });
      expect(created.activation).toBeDefined();
      const result = executeRealSupplierOrder({
        activationId: created.activation!.activationId,
        actorId: "manager@example.com",
        humanConfirmation: true,
        confirmationNonce: "confirm-nonce-12345678",
        idempotencyKey: "exec_key",
        orderValue: 100,
        payloadHash: "abc123",
        inventoryReservationId: "res-1",
      });
      expect(result.blocked).toBe(true);
      expect(result.code).toBe("REAL_ORDER_ENDPOINT_NOT_VALIDATED");
      expect(result.httpCallsMade).toBe(0);
      expect(getActivationSafetyCounters().realSupplierOrderCalls).toBe(0);
      const audit = listActivationAudit({ type: "REAL_ORDER_ATTEMPT_BLOCKED" });
      expect(audit.length).toBeGreaterThan(0);
    });

    it("confirm activation blocked while createOrder unverified", () => {
      seedActivationFixtures();
      const created = createActivationRequest({
        requester: "ops@example.com",
        idempotencyKey: `act_confirm_${Date.now()}`,
      });
      if (!created.activation) return;
      created.activation.status = "APPROVED";
      created.activation.approvalId = "appr-test";
      created.activation.networkState = "ARMED";
      saveActivationRecord(created.activation);

      const confirm = confirmActivation({
        activationId: created.activation.activationId,
        actorId: "manager@example.com",
        approvalId: "appr-test",
        confirmationNonce: "nonce-12345678",
        idempotencyKey: "confirm_key",
      });
      expect(confirm.ok).toBe(false);
      expect(confirm.blockers).toContain("REAL_ORDER_ENDPOINT_NOT_VALIDATED");
    });
  });

  describe("First order gate", () => {
    it("previewFirstOrder makes zero HTTP calls", () => {
      seedActivationFixtures();
      const created = createActivationRequest({
        requester: "ops@example.com",
        idempotencyKey: `act_fo_${Date.now()}`,
      });
      if (!created.activation) return;
      created.activation.status = "APPROVED";
      created.activation.approvalId = "appr-fo";
      created.activation.approvedBy = "manager@example.com";
      created.activation.networkState = "ARMED";
      saveActivationRecord(created.activation);

      const preview = previewFirstOrder({
        activationId: created.activation.activationId,
        payload: {
          supplierId: getInterCarsSupplierId(),
          market: "DE",
          channel: "DIRECT",
          items: [{ sku: "SKU-1", quantity: 1, unitCost: 50 }],
          shippingAddress: { country: "DE", city: "Berlin" },
          currency: "EUR",
          inventoryReservationId: "res-1",
          priceSnapshotId: "price-1",
          supplierAssignmentSnapshotId: "assign-1",
        },
      });
      expect(preview.httpCallsMade).toBe(0);
      expect(preview.createOrderCapability).toBe("UNVERIFIED");
    });

    it("invalidates approval on payload hash change", () => {
      seedActivationFixtures();
      const created = createActivationRequest({
        requester: "ops@example.com",
        idempotencyKey: `act_hash_${Date.now()}`,
      });
      if (!created.activation) return;
      const prep = prepareFirstOrderGate({
        activationId: created.activation.activationId,
        payload: {
          supplierId: getInterCarsSupplierId(),
          market: "DE",
          channel: "DIRECT",
          items: [{ sku: "SKU-1", quantity: 1, unitCost: 50 }],
          shippingAddress: { country: "DE", city: "Berlin" },
          currency: "EUR",
          inventoryReservationId: "res-1",
          priceSnapshotId: "price-1",
          supplierAssignmentSnapshotId: "assign-1",
        },
        idempotencyKey: `fo_${Date.now()}`,
        actorId: "ops@example.com",
      });
      if (!prep.gate) return;
      const invalidated = invalidateFirstOrderOnPayloadChange({
        firstOrderId: prep.gate.firstOrderId,
        newPayloadHash: "changed-hash",
      });
      expect(invalidated.invalidated).toBe(true);
    });
  });

  describe("Kill switch", () => {
    it("blocks arm when kill switch ON", () => {
      seedActivationFixtures();
      setGlobalKillSwitch(true, "ops@example.com", "kill-test");
      const created = createActivationRequest({
        requester: "ops@example.com",
        idempotencyKey: `act_kill_${Date.now()}`,
      });
      if (!created.activation) return;
      created.activation.status = "APPROVED";
      created.activation.approvalId = "appr-kill";
      created.activation.approvedBy = "manager@example.com";
      saveActivationRecord(created.activation);
      const armed = armActivation({
        activationId: created.activation.activationId,
        actorId: "manager@example.com",
      });
      expect(armed.ok).toBe(false);
      expect(armed.blockers).toContain("KILL_SWITCH");
    });
  });

  describe("AI boundary", () => {
    it("blocks AI from requesting activation", () => {
      const result = createActivationRequest({
        requester: "ai_agent",
        idempotencyKey: `act_ai_${Date.now()}`,
      });
      expect(result.ok).toBe(false);
      expect(result.blockers).toContain("AI_BOUNDARY:REQUEST_FORBIDDEN");
    });

    it("blocks AI from confirming", () => {
      seedActivationFixtures();
      const created = createActivationRequest({
        requester: "ops@example.com",
        idempotencyKey: `act_ai2_${Date.now()}`,
      });
      if (!created.activation) return;
      const confirm = confirmActivation({
        activationId: created.activation.activationId,
        actorId: "ai_agent",
        approvalId: "x",
        confirmationNonce: "nonce-12345678",
        idempotencyKey: "k",
      });
      expect(confirm.ok).toBe(false);
      expect(confirm.blockers).toContain("AI_BOUNDARY:CONFIRM_FORBIDDEN");
    });
  });

  describe("Failure injection catalog", () => {
    it("maps all failure injection types", () => {
      const types = [
        "CREATEORDER_UNVERIFIED",
        "SELF_APPROVAL",
        "KILL_SWITCH_ON",
        "EXPIRED_REHEARSAL",
        "AI_BOUNDARY",
      ] as const;
      for (const t of types) {
        expect(resolveActivationFailureInjection(t)?.blockerCode).toBeTruthy();
      }
    });
  });

  describe("Dashboard & safety invariants", () => {
    it("reports NOT ACTIVE and UNVERIFIED", () => {
      const dash = getSupplierOrderActivationDashboard();
      expect(dash.realSupplierOrderNetwork).toBe("DISABLED");
      expect(dash.interCarsCreateOrder).toBe("UNVERIFIED");
      expect(dash.productionActivation).toBe("NOT ACTIVE");
      expect(dash.firstRealOrder).toBe("NOT SENT");
      expect(dash.firstOrdersSent).toBe(0);
    });

    it("maintains zero real call counters", () => {
      const safety = assertActivationSafetyInvariants();
      expect(safety.ok).toBe(true);
      expect(getActivationSafetyCounters().realSupplierOrderCalls).toBe(0);
      expect(getActivationSafetyCounters().realPaymentCalls).toBe(0);
      expect(getActivationSafetyCounters().realCarrierCalls).toBe(0);
    });
  });

  describe("Payload hash", () => {
    it("produces deterministic hash", () => {
      const a = hashPayload({ b: 2, a: 1 });
      const b = hashPayload({ a: 1, b: 2 });
      expect(a).toBe(b);
    });
  });
});
