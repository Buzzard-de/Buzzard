import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  pollSupplierTracking,
  classifyTrackingSource,
  isSandboxTrackingId,
  getTrackingFulfillmentDashboard,
  assertTrackingSafetyInvariants,
  resetTrackingSafetyCountersForTests,
  resetTrackingForTests,
} from "./index";

const ORIGINAL = { ...process.env };

describe("#349 Tracking fulfillment", () => {
  beforeEach(() => {
    process.env.SUPPLIER_ORDER_NETWORK_ENABLED = "0";
    resetTrackingForTests();
    resetTrackingSafetyCountersForTests();
  });
  afterEach(() => {
    process.env = { ...ORIGINAL };
  });

  it("classifies SANDBOX-TRACK-* as SANDBOX", () => {
    expect(isSandboxTrackingId("SANDBOX-TRACK-123")).toBe(true);
    expect(classifyTrackingSource("SANDBOX-TRACK-123")).toBe("SANDBOX");
  });

  it("does not treat sandbox tracking as LIVE", async () => {
    const event = await pollSupplierTracking({
      supplierId: "SUP-INTER-CARS-001",
      supplierOrderId: "SBX-001",
      trackingNumber: "SANDBOX-TRACK-001",
    });
    expect(event.source).not.toBe("LIVE");
  });

  it("dashboard live UNVERIFIED", () => {
    const dash = getTrackingFulfillmentDashboard();
    expect(dash.liveStatus).toBe("UNVERIFIED");
    expect(dash.productionEnabled).toBe("DISABLED");
  });

  it("safety invariants pass", () => {
    expect(assertTrackingSafetyInvariants().ok).toBe(true);
  });
});
