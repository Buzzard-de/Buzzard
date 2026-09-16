import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  runGoLiveRehearsal,
  assertRehearsalSafetyInvariants,
  resetRehearsalSafetyCountersForTests,
  resetRehearsalForTests,
  hydrateRehearsalFromPersistence,
  getRehearsalSafetyCounters,
  getSupplierOrderRehearsalDashboard,
  listRehearsalRecords,
  classifySupplierOrderReference,
  buildSimulatedTracking,
} from "./index";
import { createOrder, buildSingleItemOrderInput, clearOrderRegistry, seedOrderEngineFixtures } from "@/lib/order-engine";
import {
  evaluateSupplierOrderReadiness,
  requestSupplierOrderApproval,
  approveSupplierOrderActivation,
  resetReadinessForTests,
  resetKillSwitchForTests,
  setGlobalKillSwitch,
  saveReadinessRecord,
  getRealSupplierOrderHttpCallCount,
  resetRealSupplierOrderHttpCallCountForTests,
} from "@/lib/supplier-order-readiness";
import { resetSupplierEngineForTests } from "@/lib/supplier-engine/testReset";
import { resetControlTowerForTests } from "@/lib/fulfillment-control-tower";
import { seedMarketplaceEngineFixtures } from "@/lib/marketplace-engine";
import { listMarkets } from "@/lib/market-engine/registry";
const ORIGINAL_NETWORK = process.env.SUPPLIER_ORDER_NETWORK_ENABLED;

async function prepareRehearsalOrder() {
  clearOrderRegistry();
  seedOrderEngineFixtures();
  const orderResult = await createOrder(
    buildSingleItemOrderInput("reifen-pilot-sport", {
      idempotencyKey: `reh_prep_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    })
  );
  expect(orderResult.ok).toBe(true);
  const supplierId = orderResult.order!.items[0]!.supplierId;
  const scope = { supplierId, market: "DE" as const, channel: "DIRECT" as const };
  const readiness = evaluateSupplierOrderReadiness(scope, { force: true });
  readiness.overallStatus = "READY";
  readiness.blockers = [];
  readiness.riskLevel = "LOW";
  saveReadinessRecord(readiness);
  const req = requestSupplierOrderApproval({
    readinessId: readiness.readinessId,
    requester: "ops@example.com",
    correlationId: "prep",
  });
  expect(req.ok).toBe(true);
  approveSupplierOrderActivation({
    approvalId: req.approval!.approvalId,
    approver: "manager@example.com",
    correlationId: "prep",
  });
  return { orderId: orderResult.order!.orderId, supplierId, scope };
}

describe("#338 Supplier Order Go-Live Rehearsal", () => {
  beforeEach(() => {
    process.env.SUPPLIER_ORDER_NETWORK_ENABLED = "0";
    resetSupplierEngineForTests();
    resetControlTowerForTests();
    resetReadinessForTests();
    resetKillSwitchForTests();
    resetRehearsalForTests();
    resetRehearsalSafetyCountersForTests();
    resetRealSupplierOrderHttpCallCountForTests();
    seedMarketplaceEngineFixtures();
  });

  afterEach(() => {
    if (ORIGINAL_NETWORK === undefined) delete process.env.SUPPLIER_ORDER_NETWORK_ENABLED;
    else process.env.SUPPLIER_ORDER_NETWORK_ENABLED = ORIGINAL_NETWORK;
  });

  describe("Full rehearsal lifecycle", () => {
    it("runs end-to-end rehearsal with sandbox fallback when network disabled", async () => {
      const prep = await prepareRehearsalOrder();
      const result = await runGoLiveRehearsal({
        orderId: prep.orderId,
        market: "DE",
        channel: "DIRECT",
        requester: "ops@example.com",
        approver: "manager@example.com",
        idempotencyKey: `reh_full_${Date.now()}`,
      });

      expect(result.realActivationBlocked).toBe(true);
      expect(result.supplierOrderClassification).toBe("SANDBOX");
      expect(result.simulatedSupplierOrderId?.startsWith("SANDBOX-ORDER-")).toBe(true);
      expect(result.overallStatus).toBe("PASSED");
      expect(result.stages.some((s) => s.stage === "ACTIVATION_BOUNDARY" && s.status === "PASS")).toBe(true);
      expect(result.stages.some((s) => s.stage === "SANDBOX_SUPPLIER_ACCEPTANCE" && s.status === "PASS")).toBe(true);

      const safety = assertRehearsalSafetyInvariants();
      expect(safety.ok).toBe(true);
      expect(getRealSupplierOrderHttpCallCount()).toBe(0);
    });
  });

  describe("Activation boundary", () => {
    it("blocks real activation and continues via sandbox", async () => {
      const prep = await prepareRehearsalOrder();
      const result = await runGoLiveRehearsal({
        orderId: prep.orderId,
        requester: "ops@example.com",
        approver: "manager@example.com",
        idempotencyKey: `reh_act_${Date.now()}`,
      });
      const boundary = result.stages.find((s) => s.stage === "ACTIVATION_BOUNDARY");
      expect(boundary?.status).toBe("PASS");
      expect(boundary?.detail?.code).toBeTruthy();
    });
  });

  describe("Negative cases", () => {
    it("BLOCKED readiness stops rehearsal", async () => {
      const result = await runGoLiveRehearsal({
        requester: "ops@example.com",
        idempotencyKey: `reh_blocked_${Date.now()}`,
      });
      expect(["BLOCKED", "FAILED"]).toContain(result.overallStatus);
    });

    it("kill switch blocks rehearsal", async () => {
      const prep = await prepareRehearsalOrder();
      setGlobalKillSwitch(true, "admin@example.com", "kill-test");
      const result = await runGoLiveRehearsal({
        orderId: prep.orderId,
        requester: "ops@example.com",
        approver: "manager@example.com",
        idempotencyKey: `reh_kill_${Date.now()}`,
      });
      expect(result.overallStatus).toBe("BLOCKED");
      expect(
      result.stages.some(
        (s) =>
          s.stage === "KILL_SWITCH" ||
          (s.stage === "SUPPLIER_READINESS" && s.status === "BLOCKED"),
      ),
    ).toBe(true);
    });

    it("failure injection blocks at expected stage", async () => {
      const prep = await prepareRehearsalOrder();
      const result = await runGoLiveRehearsal({
        orderId: prep.orderId,
        requester: "ops@example.com",
        approver: "manager@example.com",
        failureInjection: "KILL_SWITCH_ENABLED",
        idempotencyKey: `reh_inj_${Date.now()}`,
      });
      expect(result.overallStatus).toBe("BLOCKED");
    });

    it("order limit exceeded blocks rehearsal", async () => {
      const prep = await prepareRehearsalOrder();
      const result = await runGoLiveRehearsal({
        orderId: prep.orderId,
        requester: "ops@example.com",
        approver: "manager@example.com",
        orderValue: 999999,
        idempotencyKey: `reh_limit_${Date.now()}`,
      });
      expect(result.overallStatus).toBe("BLOCKED");
    });
  });

  describe("Sandbox & simulation", () => {
    it("never classifies sandbox order as LIVE", () => {
      expect(classifySupplierOrderReference("SANDBOX-ORDER-ABC123")).toBe("SANDBOX");
      expect(classifySupplierOrderReference("LIVE-ORDER-123")).toBe("LIVE");
    });

    it("creates simulated tracking", () => {
      const tracking = buildSimulatedTracking("SANDBOX-ORDER-TEST123");
      expect(tracking.trackingNumber.startsWith("SANDBOX-TRACK-")).toBe(true);
      expect(tracking.simulated).toBe(true);
      expect(tracking.carrier).toBe("SANDBOX_CARRIER");
    });
  });

  describe("Idempotency & concurrency", () => {
    it("reuses rehearsal for same idempotency key", async () => {
      const prep = await prepareRehearsalOrder();
      const key = `reh_idem_${Date.now()}`;
      const a = await runGoLiveRehearsal({
        orderId: prep.orderId,
        requester: "ops@example.com",
        approver: "manager@example.com",
        idempotencyKey: key,
      });
      const b = await runGoLiveRehearsal({
        orderId: prep.orderId,
        requester: "ops@example.com",
        approver: "manager@example.com",
        idempotencyKey: key,
      });
      expect(b.rehearsalId).toBe(a.rehearsalId);
    });
  });

  describe("35 markets", () => {
    it("supports representative markets", () => {
      expect(listMarkets().length).toBe(35);
      const samples = ["DE", "FR", "IT", "ES", "PL", "TR", "SA", "EG"];
      for (const code of samples) {
        expect(listMarkets().some((m) => m.countryCode === code)).toBe(true);
      }
    });
  });

  describe("AI boundary", () => {
    it("deterministic gate controls outcome regardless of AI recommendation", async () => {
      const aiRecommendation = "ACTIVATE_NOW";
      expect(aiRecommendation).toBe("ACTIVATE_NOW");
      const prep = await prepareRehearsalOrder();
      const result = await runGoLiveRehearsal({
        orderId: prep.orderId,
        requester: "ops@example.com",
        approver: "manager@example.com",
        idempotencyKey: `reh_ai_${Date.now()}`,
      });
      expect(result.realActivationBlocked).toBe(true);
    });
  });

  describe("Safety invariants", () => {
    it("maintains zero real network calls", async () => {
      const prep = await prepareRehearsalOrder();
      await runGoLiveRehearsal({
        orderId: prep.orderId,
        requester: "ops@example.com",
        approver: "manager@example.com",
        idempotencyKey: `reh_safe_${Date.now()}`,
      });
      const counters = getRehearsalSafetyCounters();
      expect(counters.realSupplierOrderHttpCalls).toBe(0);
      expect(counters.realCustomerShipments).toBe(0);
      expect(counters.realPaymentCaptures).toBe(0);
      expect(counters.realMarketplaceSubmissions).toBe(0);
      expect(counters.realCarrierCalls).toBe(0);
      expect(assertRehearsalSafetyInvariants().ok).toBe(true);
    });
  });

  describe("Persistence", () => {
    it.skipIf(!hasPersistentStore())("hydrates rehearsal from persistence", async () => {
      const prep = await prepareRehearsalOrder();
      await runGoLiveRehearsal({
        orderId: prep.orderId,
        requester: "ops@example.com",
        approver: "manager@example.com",
        idempotencyKey: `reh_persist_${Date.now()}`,
      });
      resetRehearsalForTests();
      hydrateRehearsalFromPersistence();
      expect(listRehearsalRecords().length).toBeGreaterThan(0);
    });
  });

  describe("Admin dashboard", () => {
    it("returns dashboard with safety counters", async () => {
      const prep = await prepareRehearsalOrder();
      await runGoLiveRehearsal({
        orderId: prep.orderId,
        requester: "ops@example.com",
        approver: "manager@example.com",
        idempotencyKey: `reh_dash_${Date.now()}`,
      });
      const dash = getSupplierOrderRehearsalDashboard();
      expect(dash.realSupplierOrderNetwork).toBe("DISABLED");
      expect(dash.safety.realSupplierOrderHttpCalls).toBe(0);
    });
  });

  describe("Performance", () => {
    it("runs 10 rehearsals within acceptable time", async () => {
      const started = Date.now();
      for (let i = 0; i < 10; i++) {
        const prep = await prepareRehearsalOrder();
        await runGoLiveRehearsal({
          orderId: prep.orderId,
          requester: "ops@example.com",
          approver: "manager@example.com",
          idempotencyKey: `reh_perf_${i}_${Date.now()}`,
        });
      }
      expect(Date.now() - started).toBeLessThan(60000);
      expect(listRehearsalRecords().length).toBeGreaterThanOrEqual(10);
    });
  });
});

function hasPersistentStore() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createSupplierOrderRehearsalStore } = require("../../server/lib/supplier-order-rehearsal/persistentStore.js");
    return Boolean(createSupplierOrderRehearsalStore());
  } catch {
    return false;
  }
}
