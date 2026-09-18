import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  initiateSupplierRecovery,
  advanceRecoveryStage,
  assertSupplierRecoveryNeverAssumed,
  getReturnsRefundsProductionDashboard,
  assertReturnsRefundsSafetyInvariants,
  resetReturnsRefundsSafetyCountersForTests,
  resetReturnsRefundsForTests,
} from "./index";

const ORIGINAL = { ...process.env };

describe("#353 Returns refunds production", () => {
  beforeEach(() => {
    process.env.RETURNS_PRODUCTION_ENABLED = "0";
    resetReturnsRefundsForTests();
    resetReturnsRefundsSafetyCountersForTests();
  });
  afterEach(() => {
    process.env = { ...ORIGINAL };
  });

  it("tracks recovery stages without assuming supplier credit", () => {
    const rec = initiateSupplierRecovery({
      returnId: "ret1",
      orderId: "ord1",
      supplierId: "SUP-INTER-CARS-001",
      estimatedAmount: 50,
    });
    expect(rec.assumed).toBe(false);
    assertSupplierRecoveryNeverAssumed(rec);
    const requested = advanceRecoveryStage(rec.recoveryId, "REQUESTED", 50);
    expect(requested.stage).toBe("REQUESTED");
    expect(requested.requestedAmount).toBe(50);
  });

  it("dashboard production DISABLED", () => {
    expect(getReturnsRefundsProductionDashboard().productionEnabled).toBe("DISABLED");
  });

  it("zero real refunds", () => {
    expect(assertReturnsRefundsSafetyInvariants().ok).toBe(true);
  });
});
