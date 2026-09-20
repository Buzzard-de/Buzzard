import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resetRejectedEvidenceAttemptsForTests } from "@/lib/production-access/evidencePolicy";
import { resetExternalProviderEvidenceStoreForTests } from "@/lib/master-external-provider-readiness/externalProviderEvidenceStore";
import { buildMasterFinalCompletionReport } from "./masterFinalCompletionReport";
import { executeMasterFinalPhasesInOrder } from "./phaseExecution";

const ORIGINAL = { ...process.env };

describe("Master final completion (A→F)", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL };
    process.env.SALES_ENABLED = "0";
    process.env.PAYMENT_PRODUCTION_ENABLED = "0";
    process.env.AI_PRODUCTION_ENABLED = "0";
    resetExternalProviderEvidenceStoreForTests();
    resetRejectedEvidenceAttemptsForTests();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL };
  });

  it("executes phases in order A through F", () => {
    const chain = executeMasterFinalPhasesInOrder();
    expect(chain.executionOrder).toEqual(["A", "B", "C", "D", "E", "F"]);
    expect(chain.phases.length).toBe(6);
  });

  it("keeps production and sales blocked", () => {
    const report = buildMasterFinalCompletionReport();
    expect(report.SALES_ENABLED).toBe("0");
    expect(report.scoreboard.PRODUCTION).toBe("BLOCKED");
    expect(report.scoreboard.GO_LIVE).toBe("BLOCKED");
    expect(report.fakeProductionEvidence).toBe(0);
  });

  it("reports zero real side effects in CI", () => {
    const report = buildMasterFinalCompletionReport();
    const total = Object.values(report.sideEffects).reduce((a, b) => a + b, 0);
    expect(total).toBe(0);
  });
});
