import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  buildFinalClosureReport,
  runFinalGoLiveCheck,
  evaluateFinalSalesEnablement,
  buildFinalBlockerRegistry,
  evaluateFinalSecurityGate,
  assertEvidenceEnvironmentAllowed,
  isRejectedEvidenceEnvironment,
  resetRejectedEvidenceAttemptsForTests,
  resetBackupRestoreEvidenceForTests,
  resetFinalClosureAuditForTests,
  recordFinalClosureTransition,
} from "./index";
import { recordProviderAccessEvidence, resetEvidenceStoreForTests } from "@/lib/production-access/evidenceStore";
import { resetGlobalKillSwitchForTests } from "@/lib/production-kill-switch";

const ORIGINAL = { ...process.env };

describe("Final closure", () => {
  beforeEach(() => {
    process.env.SALES_ENABLED = "0";
    process.env.SUPPLIER_ORDER_NETWORK_ENABLED = "0";
    process.env.SUPPLIER_LIVE_READ_ENABLED = "0";
    delete process.env.SUPPLIER_LIVE_CREDENTIALS;
    delete process.env.SUPPLIER_LIVE_CREDENTIALS_SECRET_REF;
    delete process.env.BUZZARD_FORCE_GO_LIVE;
    resetEvidenceStoreForTests();
    resetRejectedEvidenceAttemptsForTests();
    resetBackupRestoreEvidenceForTests();
    resetFinalClosureAuditForTests();
    resetGlobalKillSwitchForTests();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL };
  });

  it("final go-live check returns BLOCKED without credentials", () => {
    const check = runFinalGoLiveCheck();
    expect(check.finalGoLive).toBe("BLOCKED");
    expect(check.sales).toBe("CLOSED");
    expect(check.criticalBlockers).toBeGreaterThan(0);
  });

  it("rejects mock/sandbox/simulation evidence", () => {
    for (const env of ["MOCK", "SANDBOX", "SIMULATION", "UNIT_TEST", "FIXTURE"]) {
      expect(isRejectedEvidenceEnvironment(env)).toBe(true);
      expect(() => assertEvidenceEnvironmentAllowed(env, "TEST")).toThrow("FAKE_EVIDENCE_REJECTED");
    }
  });

  it("accepts PRODUCTION and CONTROLLED_VALIDATION evidence", () => {
    const evidence = recordProviderAccessEvidence({
      provider: "inter-cars",
      capability: "health",
      endpoint: "/health",
      requestPayload: { probe: true },
      responseStatus: 200,
      environment: "PRODUCTION",
    });
    expect(evidence.environment).toBe("PRODUCTION");
  });

  it("sales enablement blocked without mandatory gates", () => {
    const sales = evaluateFinalSalesEnablement();
    expect(sales.allowed).toBe(false);
    expect(sales.salesEnabled).toBe("CLOSED");
    expect(sales.blockers.length).toBeGreaterThan(0);
  });

  it("sales enablement blocked when SALES_ENABLED=1 but gates fail", () => {
    process.env.SALES_ENABLED = "1";
    const sales = evaluateFinalSalesEnablement();
    expect(sales.salesEnabled).toBe("CLOSED");
    expect(sales.reasons.some((r) => r.includes("criticalBlockers") || r.includes("SALES_ENABLED_BUT"))).toBe(true);
  });

  it("blocker registry includes minimum required codes", () => {
    const blockers = buildFinalBlockerRegistry();
    const codes = blockers.map((b) => b.code);
    expect(codes).toContain("INTER_CARS_CREDENTIAL");
    expect(codes).toContain("CREATE_ORDER_VALIDATION");
    expect(codes).toContain("FIRST_PRODUCTION_ORDER");
    expect(codes).toContain("BACKUP_RESTORE");
    expect(codes).toContain("OBSERVATION");
    const security = evaluateFinalSecurityGate();
    expect(["PASS", "BLOCKED", "UNVERIFIED"]).toContain(security.status);
  });

  it("closure report fake evidence count zero in prep", () => {
    const report = buildFinalClosureReport();
    expect(report.fakeEvidenceCount).toBe(0);
    expect(report.finalGoLive).toBe("BLOCKED");
    expect(report.finalDecision).toBe("BLOCKED");
  });

  it("records final closure transition audit", () => {
    const event = recordFinalClosureTransition({
      fromState: "BLOCKED",
      toState: "NOT_READY",
      operator: "ops@test.com",
      approval: "approval-1",
    });
    expect(event.fromState).toBe("BLOCKED");
    expect(event.correlationId).toBeTruthy();
  });

  it("inter-cars flow stages blocked without evidence", () => {
    const report = buildFinalClosureReport();
    expect(report.interCarsFlow.every((s) => s.status !== "PASS" || s.stage === undefined)).toBe(true);
    expect(report.interCarsFlow[0].status).not.toBe("PASS");
  });

  it("real side effects zero in prep", () => {
    const report = buildFinalClosureReport();
    const total = Object.values(report.realSideEffects).reduce((a, b) => a + b, 0);
    expect(total).toBe(0);
  });
});
