import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resetRejectedEvidenceAttemptsForTests } from "@/lib/production-access/evidencePolicy";
import { buildMasterExternalProviderReadinessReport } from "./masterReadinessReport";
import { buildMasterProviderMatrix } from "./masterProviderMatrix";
import {
  registerExternalProviderEvidence,
  resetExternalProviderEvidenceStoreForTests,
} from "./externalProviderEvidenceStore";

const ORIGINAL = { ...process.env };

describe("Master external provider readiness (#363-#366)", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL };
    process.env.SALES_ENABLED = "0";
    process.env.PAYMENT_PRODUCTION_ENABLED = "0";
    process.env.CARRIER_PRODUCTION_ENABLED = "0";
    process.env.MARKETING_SPEND_ENABLED = "0";
    process.env.AI_PRODUCTION_ENABLED = "0";
    resetExternalProviderEvidenceStoreForTests();
    resetRejectedEvidenceAttemptsForTests();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL };
  });

  it("defaults to blocked external access without credentials", () => {
    const report = buildMasterExternalProviderReadinessReport();
    expect(report.scoreboard.SALES).toBe("DISABLED");
    expect(report.scoreboard.LIVE_VALIDATION).toBe("BLOCKED");
    expect(report.scoreboard.PAYMENT).not.toBe("VALIDATED");
    expect(report.sideEffects.realPayments).toBe(0);
  });

  it("secretRef alone does not validate payment", () => {
    process.env.PAYMENT_PROVIDER_SECRET_REF = "PAYMENT_PROVIDER_SECRET";
    const matrix = buildMasterProviderMatrix();
    const payment = matrix.find((r) => r.provider === "PAYMENT");
    expect(payment?.credentialState).not.toBe("VALIDATED");
    expect(payment?.liveValidation).not.toBe("VALIDATED");
  });

  it("rejects sandbox evidence as production", () => {
    expect(() =>
      registerExternalProviderEvidence({
        category: "PAYMENT",
        providerId: "payment",
        environment: "PRODUCTION",
        source: "SANDBOX",
        capability: "authentication",
        timestamp: new Date().toISOString(),
        endpoint: "https://api.example.com/health",
        responseStatus: 200,
        secretRef: "env:PAYMENT_PROVIDER_SECRET_REF",
        evidenceReference: "ref-1",
        operator: "op",
      }),
    ).toThrow(/SOURCE_NOT_LIVE/);
  });

  it("rejects forbidden side-effect capabilities", () => {
    expect(() =>
      registerExternalProviderEvidence({
        category: "PAYMENT",
        providerId: "payment",
        environment: "PRODUCTION",
        source: "EXTERNAL_LIVE",
        capability: "charge",
        timestamp: new Date().toISOString(),
        endpoint: "https://api.example.com/pay",
        responseStatus: 200,
        secretRef: "env:PAYMENT_PROVIDER_SECRET_REF",
        evidenceReference: "ref-2",
        operator: "op",
      }),
    ).toThrow(/FORBIDDEN/);
  });

  it("anti-false-positive: CONFIGURED payment row is not VALIDATED without evidence", () => {
    process.env.PAYMENT_PROVIDER_SECRET_REF = "X";
    process.env.PAYMENT_PROVIDER_SECRET = JSON.stringify({ key: "test-not-live" });
    const report = buildMasterExternalProviderReadinessReport();
    expect(report.scoreboard.PAYMENT).not.toBe("VALIDATED");
  });

  it("builds master matrix including render and inter cars", () => {
    const matrix = buildMasterProviderMatrix();
    expect(matrix.some((r) => r.provider === "RENDER")).toBe(true);
    expect(matrix.some((r) => r.provider === "INTER_CARS")).toBe(true);
    expect(matrix.some((r) => r.category === "MARKETPLACE")).toBe(true);
  });

  it("generates blockers and human actions without executing them", () => {
    const report = buildMasterExternalProviderReadinessReport();
    expect(report.blockers.length).toBeGreaterThan(0);
    expect(report.nextHumanActions.length).toBeGreaterThan(0);
    expect(report.nextHumanActions.every((a) => a.blocking)).toBe(true);
  });
});
