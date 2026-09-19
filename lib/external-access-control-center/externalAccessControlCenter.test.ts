import { describe, it, expect, beforeEach } from "vitest";
import { buildExternalAccessControlCenterReport } from "./controlCenterReport";
import { buildProviderRegistry } from "./masterProviderRegistry";
import { collectEvidenceRecords } from "./evidenceEngine";
import { buildExtendedGoLiveGraph } from "./goLiveControlGraph";
import { assertEvidenceEnvironmentAllowed, resetRejectedEvidenceAttemptsForTests } from "@/lib/production-access/evidencePolicy";
import { resetEvidenceStoreForTests } from "@/lib/production-access/evidenceStore";

describe("External Access Control Center", () => {
  beforeEach(() => {
    resetEvidenceStoreForTests();
    resetRejectedEvidenceAttemptsForTests();
    process.env.SALES_ENABLED = "0";
    process.env.SUPPLIER_NETWORK_ENABLED = "0";
    process.env.SUPPLIER_ORDER_NETWORK_ENABLED = "0";
    process.env.PAYMENT_PRODUCTION_ENABLED = "0";
    process.env.CARRIER_PRODUCTION_ENABLED = "0";
    process.env.MARKETING_SPEND_ENABLED = "0";
    process.env.AI_PRODUCTION_ENABLED = "0";
    delete process.env.SUPPLIER_LIVE_CREDENTIALS_SECRET_REF;
  });

  it("builds provider registry from existing external access matrix", () => {
    const registry = buildProviderRegistry();
    expect(registry.some((r) => r.name === "INTER CARS")).toBe(true);
    expect(registry.some((r) => r.name === "PAYMENT")).toBe(true);
    expect(registry.some((r) => r.category === "CARRIER")).toBe(true);
  });

  it("never sets SALES_ENABLED to 1 in master status", () => {
    const report = buildExternalAccessControlCenterReport();
    expect(report.masterStatus.SALES_ENABLED).toBe("0");
    expect(report.scoreboard.SALES).toBe("DISABLED");
  });

  it("blocks go-live and production when external access missing", () => {
    const report = buildExternalAccessControlCenterReport();
    expect(report.masterStatus.GO_LIVE).toBe("BLOCKED");
    expect(report.masterStatus.PRODUCTION).toBe("BLOCKED");
    expect(report.masterStatus.EXTERNAL_ACCESS).toBe("HUMAN_REQUIRED");
    expect(report.masterStatus.LIVE_VALIDATION).toBe("BLOCKED");
  });

  it("separates blueprint persistence from live Render disk", () => {
    const report = buildExternalAccessControlCenterReport();
    expect(report.renderControl.BLUEPRINT_CONFIGURATION).toBe("VALIDATED");
    expect(report.renderControl.LIVE_PERSISTENT_DISK).toBe("UNVERIFIED_EXTERNAL");
    expect(report.renderControl.LIVE_DEPLOYMENT).toBe("HUMAN_REQUIRED");
  });

  it("rejects sandbox evidence as production evidence", () => {
    expect(() => assertEvidenceEnvironmentAllowed("SANDBOX", "TEST")).toThrow(/FAKE_EVIDENCE_REJECTED/);
    expect(collectEvidenceRecords()).toEqual([]);
  });

  it("includes sales enablement gate blocked in dependency graph", () => {
    const graph = buildExtendedGoLiveGraph();
    const sales = graph.find((s) => s.id === "sales-enabled");
    expect(sales?.status).toBe("BLOCKED_EXTERNAL_ACCESS");
  });

  it("generates human actions without marking them complete", () => {
    const report = buildExternalAccessControlCenterReport();
    expect(report.nextHumanActions.length).toBeGreaterThan(0);
    expect(report.nextHumanActions.every((a) => a.blocking === true)).toBe(true);
  });

  it("keeps side effect counters at zero", () => {
    const report = buildExternalAccessControlCenterReport();
    expect(report.sideEffectCounters.realSupplierOrders).toBe(0);
    expect(report.sideEffectCounters.realPayments).toBe(0);
    expect(report.sideEffectCounters.productionDeployments).toBe(0);
  });
});
