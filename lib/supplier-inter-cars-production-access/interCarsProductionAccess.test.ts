import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  evaluateInterCarsProductionAccess,
  runProductionAccessPreflight,
  getProductionAccessDashboard,
  assertProductionAccessSafetyInvariants,
  resetProductionAccessSafetyCountersForTests,
  resolveCredentialDisplayStatus,
  getInterCarsSupplierId,
  evaluateStageAReadValidation,
  buildInterCarsAccessStatusReport,
  isStageAValidated,
} from "./index";
import { resetValidationForTests, saveValidationRecord } from "@/lib/supplier-production-validation/persistence";
import { resetSupplierEngineForTests } from "@/lib/supplier-engine/testReset";
import { getSupplier } from "@/lib/supplier-engine/registry";

const ORIGINAL_ENV = { ...process.env };

const VALID_JWT_CREDENTIAL = JSON.stringify({
  accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJwcm9kLXVzZXIifQ.sig",
});

function seedEnv() {
  process.env.SUPPLIER_LIVE_PROFILE = "inter-cars";
  process.env.SUPPLIER_ORDER_NETWORK_ENABLED = "0";
  process.env.SUPPLIER_NETWORK_ENABLED = "0";
  process.env.SUPPLIER_CONTROLLED_VALIDATION_NETWORK = "0";
  process.env.SUPPLIER_CREATE_ORDER_VALIDATION_ENABLED = "0";
  process.env.SUPPLIER_CREATE_ORDER_VALIDATION_MODE = "MOCK";
  delete process.env.SUPPLIER_LIVE_CREDENTIALS;
}

describe("Inter Cars production access preparation", () => {
  beforeEach(() => {
    seedEnv();
    resetSupplierEngineForTests();
    resetProductionAccessSafetyCountersForTests();
    resetValidationForTests();
    getSupplier(getInterCarsSupplierId());
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  describe("Default CI (no credentials)", () => {
    it("credentials NOT_CONFIGURED", () => {
      const cred = resolveCredentialDisplayStatus({ supplierId: getInterCarsSupplierId() });
      expect(cred.status).toBe("NOT_CONFIGURED");
    });

    it("diagnostic BLOCKED without fake VALIDATED", () => {
      const diag = evaluateInterCarsProductionAccess();
      expect(diag.productionCredentials).toBe("NOT_CONFIGURED");
      expect(diag.createOrderCapability).toBe("UNVERIFIED");
      expect(diag.controlledLiveValidation).toBe("BLOCKED");
      expect(diag.supplierOrderNetwork).toBe("OFF");
      expect(diag.productionNetwork).toBe("OFF");
    });

    it("safety counters zero", () => {
      expect(assertProductionAccessSafetyInvariants().ok).toBe(true);
    });

    it("dashboard reports downstream gates blocked", () => {
      const dash = getProductionAccessDashboard();
      expect(dash.liveValidationEvidence).toBe("NONE");
      expect(dash.armingState).toBe("ARMING_BLOCKED");
      expect(dash.firstOrderState).toBe("BLOCKED");
      expect(dash.controlledGoLive).toBe("BLOCKED");
      expect(dash.observationState).toBe("BLOCKED");
    });
  });

  describe("Mock credentials", () => {
    it("blocks mock-token", () => {
      process.env.SUPPLIER_LIVE_CREDENTIALS = JSON.stringify({ accessToken: "mock-token" });
      const cred = resolveCredentialDisplayStatus({ supplierId: getInterCarsSupplierId() });
      expect(cred.status).toBe("BLOCKED");
      expect(cred.blockers).toContain("CREDENTIAL_MOCK");
    });

    it("blocks dummy-token", () => {
      process.env.SUPPLIER_LIVE_CREDENTIALS = JSON.stringify({ accessToken: "dummy-token" });
      const cred = resolveCredentialDisplayStatus({ supplierId: getInterCarsSupplierId() });
      expect(cred.status).toBe("BLOCKED");
    });

    it("blocks test-token", () => {
      process.env.SUPPLIER_LIVE_CREDENTIALS = JSON.stringify({ accessToken: "test-token" });
      const cred = resolveCredentialDisplayStatus({ supplierId: getInterCarsSupplierId() });
      expect(cred.status).toBe("BLOCKED");
    });
  });

  describe("Valid credential metadata (no live #342)", () => {
    it("credential VALID but CREATE_ORDER remains UNVERIFIED", () => {
      process.env.SUPPLIER_LIVE_CREDENTIALS = VALID_JWT_CREDENTIAL;
      const cred = resolveCredentialDisplayStatus({ supplierId: getInterCarsSupplierId() });
      expect(cred.status).toBe("VALID");
      const diag = evaluateInterCarsProductionAccess();
      expect(diag.createOrderCapability).toBe("UNVERIFIED");
      expect(diag.productionCredentials).toBe("VALID");
    });

    it("preflight still blocked without upstream gates", () => {
      process.env.SUPPLIER_LIVE_CREDENTIALS = VALID_JWT_CREDENTIAL;
      const preflight = runProductionAccessPreflight();
      expect(preflight.ready).toBe(false);
      expect(preflight.blockers.length).toBeGreaterThan(0);
    });
  });

  describe("Stage A read-only validation", () => {
    it("NOT_RUN without live read evidence", () => {
      process.env.SUPPLIER_LIVE_CREDENTIALS = VALID_JWT_CREDENTIAL;
      const stageA = evaluateStageAReadValidation("VALID");
      expect(stageA.status).toBe("NOT_RUN");
      expect(stageA.handoff).toBe("BLOCKED");
    });

    it("VALIDATED when all four capabilities pass", () => {
      process.env.SUPPLIER_LIVE_CREDENTIALS = VALID_JWT_CREDENTIAL;
      saveValidationRecord({
        validationId: "val_stage_a",
        supplierId: getInterCarsSupplierId(),
        adapterProfile: "inter-cars",
        market: "DE",
        channel: "DIRECT",
        environment: "PRODUCTION",
        overallStatus: "PASSED",
        credentialStatus: "VALID",
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
        checks: [],
        idempotencyKey: "idem_stage_a",
        correlationId: "corr_stage_a",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      expect(isStageAValidated("VALID")).toBe(true);
      const preflight = runProductionAccessPreflight();
      expect(preflight.stageAHandoff).toBe("READY_FOR_STAGE_B_342");
    });

    it("status report without credentials", () => {
      const report = buildInterCarsAccessStatusReport();
      expect(report.software).toBe("COMPLETE");
      expect(report.credential).toBe("NOT_CONFIGURED");
      expect(report.realSideEffects).toBe(0);
      expect(report.fakeEvidence).toBe(0);
    });
  });

  describe("Network safety", () => {
    it("order network OFF enforced", () => {
      process.env.SUPPLIER_ORDER_NETWORK_ENABLED = "0";
      const diag = evaluateInterCarsProductionAccess();
      expect(diag.supplierOrderNetwork).toBe("OFF");
    });

    it("diagnostic flags order network ON as blocker", () => {
      process.env.SUPPLIER_ORDER_NETWORK_ENABLED = "1";
      const diag = evaluateInterCarsProductionAccess();
      expect(diag.blockers).toContain("ORDER_NETWORK_MUST_BE_OFF_IN_PREP");
    });
  });
});
