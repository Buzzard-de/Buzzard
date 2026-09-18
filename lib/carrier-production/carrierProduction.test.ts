import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  requestLabelDryRun,
  validateParcel,
  authorizeLabelPurchase,
  getCarrierProductionDashboard,
  assertCarrierProductionSafetyInvariants,
  resetCarrierProductionSafetyCountersForTests,
  resetCarrierProductionForTests,
} from "./index";

const ORIGINAL = { ...process.env };

describe("#351 Carrier production", () => {
  beforeEach(() => {
    process.env.CARRIER_PRODUCTION_ENABLED = "0";
    resetCarrierProductionForTests();
    resetCarrierProductionSafetyCountersForTests();
  });
  afterEach(() => {
    process.env = { ...ORIGINAL };
  });

  it("validates parcel dimensions", () => {
    const result = validateParcel({
      shipmentId: "shp1",
      carrierId: "mock",
      country: "DE",
      weightKg: 0,
      dimensionsCm: { length: 10, width: 10, height: 10 },
      addressRef: "addr_ref",
      idempotencyKey: "c351_shp1",
    });
    expect(result.ok).toBe(false);
  });

  it("dry-run label without real purchase", () => {
    const label = requestLabelDryRun({
      shipmentId: "shp2",
      carrierId: "mock",
      country: "DE",
      weightKg: 2,
      dimensionsCm: { length: 30, width: 20, height: 10 },
      addressRef: "addr_ref",
      idempotencyKey: "c351_shp2",
    });
    expect(label.dryRun).toBe(true);
    expect(label.state).toBe("BLOCKED");
    expect(label.trackingReference).toMatch(/^MOCK-TRACK-/);
  });

  it("label purchase requires authorization", () => {
    expect(authorizeLabelPurchase("lbl1", "admin").authorized).toBe(false);
  });

  it("dashboard production DISABLED", () => {
    expect(getCarrierProductionDashboard().productionEnabled).toBe("DISABLED");
  });

  it("zero real labels", () => {
    expect(assertCarrierProductionSafetyInvariants().ok).toBe(true);
  });
});
