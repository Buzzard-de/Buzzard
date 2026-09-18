import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  runFinalOperationsCheck,
  buildFinalOperationsReport,
  detectCredentialMetadata,
  buildOperationsChain,
  evaluateFinalOperationsSalesGate,
  evaluateFinancialReconciliation,
} from "./index";
import { assertNoProductionBypass, detectProductionBypasses } from "@/lib/final-closure/bypassGuard";
import { resetEvidenceStoreForTests } from "@/lib/production-access/evidenceStore";
import { resetRejectedEvidenceAttemptsForTests } from "@/lib/production-access/evidencePolicy";
import { resetBackupRestoreEvidenceForTests } from "@/lib/final-closure/backupRestore";
import { resetGlobalKillSwitchForTests } from "@/lib/production-kill-switch";

const ORIGINAL = { ...process.env };

describe("Final operations", () => {
  beforeEach(() => {
    process.env.SALES_ENABLED = "0";
    process.env.SUPPLIER_ORDER_NETWORK_ENABLED = "0";
    process.env.SUPPLIER_LIVE_READ_ENABLED = "0";
    delete process.env.SUPPLIER_LIVE_CREDENTIALS;
    delete process.env.SUPPLIER_LIVE_CREDENTIALS_SECRET_REF;
    resetEvidenceStoreForTests();
    resetRejectedEvidenceAttemptsForTests();
    resetBackupRestoreEvidenceForTests();
    resetGlobalKillSwitchForTests();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL };
  });

  it("software complete with operational blockers when credentials missing", () => {
    const report = buildFinalOperationsReport();
    expect(report.softwareComplete).toBe(true);
    expect(report.interCarsCredential).toBe("MISSING");
    expect(report.finalGoLive).toBe("BLOCKED");
    expect(report.sales).toBe("CLOSED");
  });

  it("credential detection returns MISSING without secrets", () => {
    const creds = detectCredentialMetadata();
    expect(creds.every((c) => c.status === "MISSING" || c.providerId === "returns")).toBe(true);
    expect(creds.every((c) => !c.secretRefKey.includes("token"))).toBe(true);
  });

  it("operations chain blocks advancement without prior stages", () => {
    const chain = buildOperationsChain();
    expect(chain[0].id).toBe("ACCESS");
    expect(chain.find((s) => s.id === "CREATE_ORDER_342")?.canAdvance).toBe(false);
  });

  it("financial reconciliation UNVERIFIED without first order", () => {
    const fin = evaluateFinancialReconciliation();
    expect(fin.status).toBe("UNVERIFIED");
    expect(fin.blockers).toContain("FIRST_ORDER_NOT_EXECUTED");
  });

  it("sales gate blocked without mandatory gates", () => {
    const gate = evaluateFinalOperationsSalesGate();
    expect(gate.allowed).toBe(false);
    expect(gate.finalGoLive).toBe("BLOCKED");
    expect(gate.blockers.length).toBeGreaterThan(0);
  });

  it("rejects production bypass keys when enforced", () => {
    process.env.BUZZARD_ENFORCE_BYPASS_GUARD = "1";
    process.env.forceGoLive = "1";
    expect(detectProductionBypasses()).toContain("forceGoLive");
    expect(() => assertNoProductionBypass("TEST")).toThrow("PRODUCTION_BYPASS_FORBIDDEN");
  });

  it("operations check returns formatted report", () => {
    const result = runFinalOperationsCheck();
    expect(result.softwareComplete).toBe(true);
    expect(result.formatted).toContain("BUZZARD FINAL OPERATIONS");
    expect(result.formatted).toContain("FAKE EVIDENCE: 0");
    expect(result.finalGoLive).toBe("BLOCKED");
  });

  it("fake evidence count zero in prep", () => {
    const report = buildFinalOperationsReport();
    expect(report.fakeEvidenceCount).toBe(0);
  });

  it("real side effects zero in prep", () => {
    const report = buildFinalOperationsReport();
    const total = Object.values(report.realSideEffects).reduce((a, b) => a + b, 0);
    expect(total).toBe(0);
  });

  it("configured credential metadata without logging secret", () => {
    process.env.SUPPLIER_LIVE_CREDENTIALS_SECRET_REF = "projects/test/secrets/ic-oauth";
    process.env.SUPPLIER_LIVE_PROFILE = "inter-cars";
    const creds = detectCredentialMetadata();
    const ic = creds.find((c) => c.providerId === "inter-cars");
    expect(ic?.secretRefKey).toBe("SUPPLIER_LIVE_CREDENTIALS_SECRET_REF");
    expect(ic?.status).not.toBe("VALIDATED");
  });
});
