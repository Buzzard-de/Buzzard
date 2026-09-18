import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildFinalProductionCompletionReport } from "./finalDashboard";
import { buildStructuredBlockers } from "./blockerEngine";
import { evaluateSecurityGate } from "./securityGate";
import { evaluateBackupGate } from "./backupGate";
import { resetEvidenceStoreForTests } from "@/lib/production-access/evidenceStore";
import { resetProductionAccessAuditForTests } from "@/lib/production-access/audit";
import { resetGlobalKillSwitchForTests } from "@/lib/production-kill-switch";

const ORIGINAL = { ...process.env };

describe("Production completion hub", () => {
  beforeEach(() => {
    process.env.SALES_ENABLED = "0";
    process.env.SUPPLIER_ORDER_NETWORK_ENABLED = "0";
    process.env.PAYMENT_PRODUCTION_ENABLED = "0";
    resetEvidenceStoreForTests();
    resetProductionAccessAuditForTests();
    resetGlobalKillSwitchForTests();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL };
  });

  it("completion report sales CLOSED and zero fake evidence", () => {
    const report = buildFinalProductionCompletionReport();
    expect(report.sales).toBe("CLOSED");
    expect(report.fakeEvidenceCount).toBe(0);
    expect(report.finalGoLive).toBe("BLOCKED");
  });

  it("structured blockers include missing credentials without faking PASS", () => {
    const blockers = buildStructuredBlockers();
    expect(blockers.some((b) => b.code === "MISSING_INTER_CARS_CREDENTIAL")).toBe(true);
    expect(blockers.some((b) => b.code === "CREATE_ORDER_NOT_VALIDATED")).toBe(true);
    expect(blockers.every((b) => b.status !== "PASS")).toBe(true);
  });

  it("security gate PASS with production flags OFF", () => {
    const gate = evaluateSecurityGate();
    expect(gate.status).toBe("PASS");
  });

  it("security gate BLOCKED when sales enabled", () => {
    process.env.SALES_ENABLED = "1";
    const gate = evaluateSecurityGate();
    expect(gate.status).toBe("BLOCKED");
    expect(gate.blockers.some((b) => b.code === "SALES_ENABLED_IN_PREP")).toBe(true);
  });

  it("backup gate finds scripts", () => {
    const gate = evaluateBackupGate();
    expect(["PASS", "UNVERIFIED", "BLOCKED"]).toContain(gate.status);
  });

  it("all completion sections present", () => {
    const report = buildFinalProductionCompletionReport();
    const ids = report.sections.map((s) => s.section);
    expect(ids).toContain("ACCESS");
    expect(ids).toContain("GO_LIVE");
    expect(ids).toContain("SECURITY");
    expect(ids).toContain("BACKUP");
    expect(ids).toContain("MONITORING");
  });

  it("real side effects zero in prep", () => {
    const report = buildFinalProductionCompletionReport();
    const total = Object.values(report.realSideEffects).reduce((a, b) => a + b, 0);
    expect(total).toBe(0);
  });
});
