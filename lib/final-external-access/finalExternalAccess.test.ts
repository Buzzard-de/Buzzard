import { describe, it, expect, beforeEach } from "vitest";
import { buildExternalAccessMatrix } from "./externalAccessMatrix";
import { runMarket35Preflight } from "./market35Preflight";
import { buildGoLiveDependencyGraph, getCurrentBlockingStep } from "./goLiveDependencyGraph";
import { buildExternalAccessPreflightReport } from "./preflightReport";
import { resetEvidenceStoreForTests } from "@/lib/production-access/evidenceStore";

describe("Final External Access Preflight", () => {
  beforeEach(() => {
    resetEvidenceStoreForTests();
    delete process.env.SUPPLIER_LIVE_CREDENTIALS;
    delete process.env.SUPPLIER_LIVE_CREDENTIALS_SECRET_REF;
    process.env.SALES_ENABLED = "0";
  });

  it("builds external access matrix without auto-READY from CONFIGURED", () => {
    const matrix = buildExternalAccessMatrix();
    expect(matrix.length).toBeGreaterThan(10);
    const interCars = matrix.find((e) => e.provider === "INTER CARS");
    expect(interCars?.status).not.toBe("READY");
    expect(interCars?.blockingReason).toContain("MISSING PRODUCTION CREDENTIALS");
    for (const entry of matrix) {
      if (entry.status === "CONFIGURED") {
        expect(entry.productionReady).toBe(false);
      }
    }
  });

  it("runs 35-market deterministic preflight", () => {
    const result = runMarket35Preflight();
    expect(result.markets).toHaveLength(35);
    expect(result.pass + result.warning + result.blocked).toBe(35);
  });

  it("builds go-live dependency graph with blocked current step", () => {
    const graph = buildGoLiveDependencyGraph();
    expect(graph[0]?.id).toBe("external-credentials");
    const blocker = getCurrentBlockingStep(graph);
    expect(blocker).toBeDefined();
    expect(blocker?.status).toMatch(/BLOCKED|NOT_CONFIGURED/);
  });

  it("preflight report keeps SALES_ENABLED at 0 and zero side effects", () => {
    const report = buildExternalAccessPreflightReport();
    expect(report.softwareComplete).toBe(true);
    expect(report.externalAccessComplete).toBe(false);
    expect(report.liveValidationComplete).toBe(false);
    expect(report.salesEnabled).toBe("0");
    expect(report.counters.fakeEvidence).toBe(0);
    expect(report.counters.realSupplierOrders).toBe(0);
    expect(report.counters.realPaymentTransactions).toBe(0);
  });

  it("includes carrier profiles in matrix without label creation", () => {
    const matrix = buildExternalAccessMatrix();
    const dhl = matrix.find((e) => e.provider === "CARRIER/DHL");
    expect(dhl?.blockingReason).toContain("NO_LABEL");
  });
});
