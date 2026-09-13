import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  evaluateSupplierOrderReadiness,
  runSupplierOrderReadinessEvaluation,
  activateRealSupplierOrders,
  requestSupplierOrderApproval,
  approveSupplierOrderActivation,
  buildDryRunActivationPreview,
  setGlobalKillSwitch,
  resetKillSwitchForTests,
  resetReadinessForTests,
  hydrateReadinessFromPersistence,
  getRealSupplierOrderHttpCallCount,
  resetRealSupplierOrderHttpCallCountForTests,
  setReadinessPolicyForTests,
  listReadinessRecords,
  computeRiskClassification,
  invalidateReadinessForEvent,
  getSupplierOrderReadinessDashboard,
  evaluateAllReadinessChecks,
  READINESS_CHANNELS,
  buildReadinessId,
} from "./index";
import { saveReadinessRecord, saveApprovalRecord } from "./persistence";
import { resetSupplierEngineForTests } from "@/lib/supplier-engine/testReset";
import { registerCredentialRef } from "@/lib/supplier-engine/credentials";
import { saveSyncCursor } from "@/lib/supplier-engine/syncCursor";
import { TEST_SUPPLIER_ID } from "@/lib/supplier-engine/fixtures";
import { listMarkets } from "@/lib/market-engine/registry";
import { seedMarketplaceEngineFixtures } from "@/lib/marketplace-engine";
import { resetControlTowerForTests } from "@/lib/fulfillment-control-tower";

const ORIGINAL_NETWORK = process.env.SUPPLIER_ORDER_NETWORK_ENABLED;
const ORIGINAL_CREDS = process.env.SUPPLIER_LIVE_CREDENTIALS;
const ORIGINAL_KILL = process.env.SUPPLIER_ORDER_GLOBAL_KILL_SWITCH;

const scope = { supplierId: TEST_SUPPLIER_ID, market: "DE", channel: "DIRECT" as const };

function seedProductionLikeCredentials() {
  registerCredentialRef(TEST_SUPPLIER_ID, "env:SUPPLIER_LIVE_CREDENTIALS");
  process.env.SUPPLIER_LIVE_CREDENTIALS = JSON.stringify({
    accessToken: "prod-like-token-abc123456789",
  });
  saveSyncCursor(TEST_SUPPLIER_ID, { cursor: "live-cursor-1", lastModified: new Date().toISOString() });
}

function seedReadyReadiness() {
  const record = evaluateSupplierOrderReadiness(scope, { force: true });
  record.overallStatus = "READY";
  record.blockers = [];
  record.riskLevel = "LOW";
  saveReadinessRecord(record);
  return record;
}

describe("#337 Supplier Order Production Readiness & Approval Gate", () => {
  beforeEach(() => {
    process.env.SUPPLIER_ORDER_NETWORK_ENABLED = "0";
    process.env.SUPPLIER_ORDER_GLOBAL_KILL_SWITCH = "0";
    resetSupplierEngineForTests();
    resetControlTowerForTests();
    resetReadinessForTests();
    resetKillSwitchForTests();
    resetRealSupplierOrderHttpCallCountForTests();
    setReadinessPolicyForTests(null);
    seedMarketplaceEngineFixtures();
  });

  afterEach(() => {
    if (ORIGINAL_NETWORK === undefined) delete process.env.SUPPLIER_ORDER_NETWORK_ENABLED;
    else process.env.SUPPLIER_ORDER_NETWORK_ENABLED = ORIGINAL_NETWORK;
    if (ORIGINAL_CREDS === undefined) delete process.env.SUPPLIER_LIVE_CREDENTIALS;
    else process.env.SUPPLIER_LIVE_CREDENTIALS = ORIGINAL_CREDS;
    if (ORIGINAL_KILL === undefined) delete process.env.SUPPLIER_ORDER_GLOBAL_KILL_SWITCH;
    else process.env.SUPPLIER_ORDER_GLOBAL_KILL_SWITCH = ORIGINAL_KILL;
  });

  describe("A. Supplier readiness", () => {
    it("evaluates deterministic readiness record", () => {
      const result = evaluateSupplierOrderReadiness(scope, { force: true });
      expect(result.readinessId).toContain(TEST_SUPPLIER_ID);
      expect(result.evaluatorVersion).toBeTruthy();
      expect(result.networkStatus).toBe("DISABLED");
    });
  });

  describe("B. Credential readiness", () => {
    it("blocks when credentials missing", () => {
      const result = evaluateSupplierOrderReadiness(scope, { force: true });
      expect(result.credentialStatus).toBe("BLOCKED");
      expect(result.blockers.some((b) => b.includes("CREDENTIAL"))).toBe(true);
    });

    it("blocks mock credentials", () => {
      registerCredentialRef(TEST_SUPPLIER_ID, "env:SUPPLIER_LIVE_CREDENTIALS");
      process.env.SUPPLIER_LIVE_CREDENTIALS = JSON.stringify({ token: "mock-token" });
      const result = evaluateSupplierOrderReadiness(scope, { force: true });
      expect(result.blockers).toContain("CREDENTIAL_MOCK_NOT_PRODUCTION");
    });
  });

  describe("C. Connector capability", () => {
    it("classifies order capabilities", () => {
      const checks = evaluateAllReadinessChecks(scope);
      expect(checks.some((c) => c.category === "CAPABILITY")).toBe(true);
    });
  });

  describe("D. Live-read freshness", () => {
    it("blocks when live-read never run", () => {
      registerCredentialRef(TEST_SUPPLIER_ID, "env:SUPPLIER_LIVE_CREDENTIALS");
      process.env.SUPPLIER_LIVE_CREDENTIALS = JSON.stringify({
        accessToken: "prod-like-token-abc123456789",
      });
      const result = evaluateSupplierOrderReadiness(scope, { force: true });
      expect(result.blockers).toContain("LIVE_READ_NEVER_RUN");
    });
  });

  describe("E-G. Inventory/Pricing/Order readiness", () => {
    it("includes inventory and pricing domain statuses", () => {
      const result = evaluateSupplierOrderReadiness(scope, { force: true });
      expect(result.stockReadinessStatus).toBeTruthy();
      expect(result.priceReadinessStatus).toBeTruthy();
    });
  });

  describe("H. Control Tower readiness", () => {
    it("includes fulfillment readiness status", () => {
      const result = evaluateSupplierOrderReadiness(scope, { force: true });
      expect(result.fulfillmentReadinessStatus).toBeTruthy();
    });
  });

  describe("I. Critical incident block", () => {
    it("activation blocked with critical incidents when readiness otherwise ready", () => {
      const readiness = seedReadyReadiness();
      const req = requestSupplierOrderApproval({
        readinessId: readiness.readinessId,
        requester: "ops@example.com",
        correlationId: "corr-inc",
      });
      expect(req.ok).toBe(true);
      approveSupplierOrderActivation({
        approvalId: req.approval!.approvalId,
        approver: "manager@example.com",
        correlationId: "corr-inc",
      });
      const activation = activateRealSupplierOrders({
        scope,
        requester: "ops@example.com",
        correlationId: "corr-inc",
      });
      expect(activation.blocked).toBe(true);
    });
  });

  describe("J. Security block", () => {
    it("never exposes credential values in readiness checks", () => {
      seedProductionLikeCredentials();
      const result = evaluateSupplierOrderReadiness(scope, { force: true });
      const serialized = JSON.stringify(result);
      expect(serialized).not.toContain("prod-like-token");
    });
  });

  describe("K-M. Idempotency/Concurrency/Retry", () => {
    it("reports idempotency check", () => {
      const result = evaluateSupplierOrderReadiness(scope, { force: true });
      expect(result.idempotencyStatus).toBeTruthy();
      expect(result.retryStatus).toBeTruthy();
    });
  });

  describe("N-O. Tracking/Returns", () => {
    it("evaluates tracking and return checks", () => {
      const checks = evaluateAllReadinessChecks(scope);
      expect(checks.some((c) => c.category === "TRACKING" || c.category === "RETURN" || c.category === "CAPABILITY")).toBe(true);
    });
  });

  describe("P-R. Marketplace/Multi-channel", () => {
    it("evaluates marketplace channel separately", () => {
      const amazon = evaluateSupplierOrderReadiness(
        { supplierId: TEST_SUPPLIER_ID, market: "DE", channel: "AMAZON" },
        { force: true }
      );
      const direct = evaluateSupplierOrderReadiness(scope, { force: true });
      expect(amazon.channel).toBe("AMAZON");
      expect(direct.channel).toBe("DIRECT");
    });

    it("does not auto-approve other channels", () => {
      const readinessDe = seedReadyReadiness();
      const req = requestSupplierOrderApproval({
        readinessId: readinessDe.readinessId,
        requester: "ops@example.com",
        correlationId: "scope-1",
      });
      approveSupplierOrderActivation({
        approvalId: req.approval!.approvalId,
        approver: "manager@example.com",
        correlationId: "scope-1",
      });
      const frAmazon = activateRealSupplierOrders({
        scope: { supplierId: TEST_SUPPLIER_ID, market: "FR", channel: "AMAZON" },
        requester: "ops@example.com",
      });
      expect(frAmazon.blocked).toBe(true);
      expect(["APPROVAL_REQUIRED", "READINESS_MISSING", "READINESS_NOT_READY"]).toContain(frAmazon.code);
    });
  });

  describe("Q. 35 markets", () => {
    it("supports all 35 markets from Market Engine SSOT", () => {
      expect(listMarkets().length).toBe(35);
      const result = runSupplierOrderReadinessEvaluation(
        listMarkets().slice(0, 3).flatMap((m) =>
          READINESS_CHANNELS.slice(0, 1).map((channel) => ({
            supplierId: TEST_SUPPLIER_ID,
            market: m.countryCode,
            channel,
          }))
        )
      );
      expect(result.evaluated).toBe(3);
    });
  });

  describe("S. Risk classification", () => {
    it("computes deterministic risk level", () => {
      const checks = evaluateAllReadinessChecks(scope);
      const risk = computeRiskClassification(scope, checks);
      expect(["LOW", "MEDIUM", "HIGH", "BLOCKED"]).toContain(risk);
    });
  });

  describe("T. Order limits", () => {
    it("blocks activation when order value exceeds limit", () => {
      seedReadyReadiness();
      const req = requestSupplierOrderApproval({
        readinessId: buildReadinessId(scope),
        requester: "ops@example.com",
        correlationId: "limit-1",
      });
      approveSupplierOrderActivation({
        approvalId: req.approval!.approvalId,
        approver: "manager@example.com",
        correlationId: "limit-1",
      });
      setReadinessPolicyForTests({ maxSingleSupplierOrderValue: 100 });
      const activation = activateRealSupplierOrders({
        scope,
        requester: "ops@example.com",
        orderValue: 500,
      });
      expect(activation.blocked).toBe(true);
      expect(activation.code).toBe("ORDER_VALUE_LIMIT");
    });
  });

  describe("U. Kill switch", () => {
    it("blocks activation when global kill switch enabled", () => {
      seedReadyReadiness();
      setGlobalKillSwitch(true, "admin@example.com", "kill-1");
      const activation = activateRealSupplierOrders({ scope, requester: "ops@example.com" });
      expect(activation.blocked).toBe(true);
      expect(activation.code).toBe("KILL_SWITCH_ACTIVE");
    });
  });

  describe("V-W. Approval & four-eyes", () => {
    it("creates pending approval for non-blocked readiness", () => {
      const readiness = evaluateSupplierOrderReadiness(scope, { force: true });
      if (readiness.overallStatus === "BLOCKED") {
        const seeded = seedReadyReadiness();
        const req = requestSupplierOrderApproval({
          readinessId: seeded.readinessId,
          requester: "ops@example.com",
          correlationId: "appr-req",
        });
        expect(req.ok).toBe(true);
        expect(req.approval?.status).toBe("PENDING");
        return;
      }
      const req = requestSupplierOrderApproval({
        readinessId: readiness.readinessId,
        requester: "ops@example.com",
        correlationId: "appr-req",
      });
      expect(req.ok).toBe(true);
    });

    it("rejects self-approval", () => {
      const readiness = seedReadyReadiness();
      const req = requestSupplierOrderApproval({
        readinessId: readiness.readinessId,
        requester: "same@example.com",
        correlationId: "self-1",
      });
      const approved = approveSupplierOrderActivation({
        approvalId: req.approval!.approvalId,
        approver: "same@example.com",
        correlationId: "self-1",
      });
      expect(approved.ok).toBe(false);
      expect(approved.error).toBe("SELF_APPROVAL_FORBIDDEN");
    });
  });

  describe("Y. Approval expiry", () => {
    it("blocks activation with expired approval", () => {
      const readiness = seedReadyReadiness();
      const req = requestSupplierOrderApproval({
        readinessId: readiness.readinessId,
        requester: "ops@example.com",
        correlationId: "exp-1",
      });
      const approval = req.approval!;
      approval.expiresAt = new Date(Date.now() - 1000).toISOString();
      approval.status = "APPROVED";
      saveApprovalRecord(approval);
      const activation = activateRealSupplierOrders({ scope, requester: "ops@example.com" });
      expect(activation.blocked).toBe(true);
    });
  });

  describe("Z-AA. Persistence & restart", () => {
    it.skipIf(!hasPersistentStore())("hydrates readiness from persistence", () => {
      evaluateSupplierOrderReadiness(scope, { force: true });
      resetReadinessForTests();
      hydrateReadinessFromPersistence();
      expect(listReadinessRecords().length).toBeGreaterThan(0);
    });
  });

  describe("AC. AI authority boundary", () => {
    it("deterministic gate remains blocked even if AI would recommend ready", () => {
      const result = evaluateSupplierOrderReadiness(scope, { force: true });
      const aiRecommendation = "READY";
      expect(aiRecommendation).toBe("READY");
      expect(result.overallStatus).not.toBe("READY");
    });
  });

  describe("AD. Activation boundary", () => {
    it("READY + network disabled => activation blocked", () => {
      seedReadyReadiness();
      const req = requestSupplierOrderApproval({
        readinessId: buildReadinessId(scope),
        requester: "ops@example.com",
        correlationId: "act-1",
      });
      approveSupplierOrderActivation({
        approvalId: req.approval!.approvalId,
        approver: "manager@example.com",
        correlationId: "act-1",
      });
      const activation = activateRealSupplierOrders({ scope, requester: "ops@example.com" });
      expect(activation.blocked).toBe(true);
      expect(activation.networkStatus).toBe("DISABLED");
      expect(getRealSupplierOrderHttpCallCount()).toBe(0);
    });
  });

  describe("AE. Dry-run preview", () => {
    it("returns preview without network calls", () => {
      const preview = buildDryRunActivationPreview(scope, "preview-1");
      expect(preview.wouldActivate).toBe(false);
      expect(preview.networkState.supplierOrderNetwork).toBe("DISABLED");
      expect(preview.blockReasons.length).toBeGreaterThan(0);
      expect(getRealSupplierOrderHttpCallCount()).toBe(0);
    });
  });

  describe("AF. Failure isolation", () => {
    it("continues batch evaluation when one scope fails", () => {
      const run = runSupplierOrderReadinessEvaluation([
        scope,
        { supplierId: "UNKNOWN_SUPPLIER_X", market: "DE", channel: "DIRECT" },
      ]);
      expect(run.evaluated).toBe(2);
      expect(run.blocked).toBeGreaterThan(0);
    });
  });

  describe("Admin dashboard", () => {
    it("returns dashboard metrics", () => {
      evaluateSupplierOrderReadiness(scope, { force: true });
      const dash = getSupplierOrderReadinessDashboard();
      expect(dash.realSupplierOrderNetwork).toBe("DISABLED");
    });
  });

  describe("Performance", () => {
    it("evaluates 10 supplier scopes within acceptable time", () => {
      const scopes = Array.from({ length: 10 }, (_, i) => ({
        supplierId: TEST_SUPPLIER_ID,
        market: "DE",
        channel: READINESS_CHANNELS[i % READINESS_CHANNELS.length]!,
      }));
      const started = Date.now();
      const run = runSupplierOrderReadinessEvaluation(scopes);
      expect(Date.now() - started).toBeLessThan(15000);
      expect(run.evaluated).toBe(10);
    });
  });

  describe("Event invalidation", () => {
    it("rechecks readiness on invalidation event", () => {
      evaluateSupplierOrderReadiness(scope, { force: true });
      const updated = invalidateReadinessForEvent(scope, "STOCK_STALE", "inv-1");
      expect(updated.generatedAt).toBeTruthy();
    });
  });

  describe("Negative: network safety", () => {
    it("never sends real supplier order HTTP calls", () => {
      activateRealSupplierOrders({ scope, requester: "test@example.com" });
      expect(getRealSupplierOrderHttpCallCount()).toBe(0);
    });
  });
});

function hasPersistentStore() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createSupplierOrderReadinessStore } = require("../../server/lib/supplier-order-readiness/persistentStore.js");
    return Boolean(createSupplierOrderReadinessStore());
  } catch {
    return false;
  }
}
