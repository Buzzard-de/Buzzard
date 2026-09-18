import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  evaluateFinalProductionGate,
  evaluateMarketingProviders,
  authorizeMarketingSpend,
  assertFinalGoLiveSafetyInvariants,
  resetFinalGoLiveSafetyCountersForTests,
  buildFinalProductionStatusReport,
  buildGoLiveChecklist,
} from "./index";

const ORIGINAL = { ...process.env };

describe("#354 Final production go-live", () => {
  beforeEach(() => {
    process.env.SALES_ENABLED = "0";
    process.env.MARKETING_SPEND_ENABLED = "0";
    process.env.SUPPLIER_ORDER_NETWORK_ENABLED = "0";
    process.env.PAYMENT_PRODUCTION_ENABLED = "0";
    process.env.CARRIER_PRODUCTION_ENABLED = "0";
    process.env.RETURNS_PRODUCTION_ENABLED = "0";
    process.env.AI_PRODUCTION_ENABLED = "0";
    resetFinalGoLiveSafetyCountersForTests();
  });
  afterEach(() => {
    process.env = { ...ORIGINAL };
  });

  it("final gate sales CLOSED by default", () => {
    const gate = evaluateFinalProductionGate();
    expect(gate.salesEnabled).toBe("CLOSED");
    expect(gate.marketingSpendEnabled).toBe("OFF");
    expect(gate.liveStatus).toBe("BLOCKED");
    expect(gate.phase).toBe("NOT_READY");
  });

  it("marketing providers NOT_CONFIGURED without secrets", () => {
    const providers = evaluateMarketingProviders();
    expect(providers.every((p) => p.liveStatus === "NOT_CONFIGURED")).toBe(true);
    expect(providers.every((p) => !p.configured)).toBe(true);
  });

  it("marketing spend requires authorization", () => {
    expect(authorizeMarketingSpend("google_ads", "admin").authorized).toBe(false);
  });

  it("checks include security network off", () => {
    const gate = evaluateFinalProductionGate();
    expect(gate.checks.some((c) => c.domain === "SECURITY" && c.check === "network_off" && c.status === "PASS")).toBe(true);
  });

  it("zero real side effects", () => {
    expect(assertFinalGoLiveSafetyInvariants().ok).toBe(true);
  });

  it("mandatory checklist present and sales closed item PASS", () => {
    const checklist = buildGoLiveChecklist();
    expect(checklist.length).toBeGreaterThanOrEqual(16);
    expect(checklist.find((c) => c.id === "sales_closed")?.status).toBe("PASS");
  });

  it("status report separates implementation and live", () => {
    const report = buildFinalProductionStatusReport();
    expect(report.workstreams.length).toBe(8);
    expect(report.sales).toBe("CLOSED");
    expect(report.realSideEffects.realSupplierOrders).toBe(0);
  });
});
