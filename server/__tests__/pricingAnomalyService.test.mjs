import { describe, expect, it } from "vitest";

const { assessPriceChange, batchAssess, snapshot } = require("../lib/pricing/pricingAnomalyService.js");

describe("pricing anomaly service", () => {
  it("flags large swings", () => {
    const spike = assessPriceChange(10, 25);
    expect(spike.flagged).toBe(true);
    expect(spike.blockAutoPublish).toBe(true);
    const calm = assessPriceChange(10, 10.5);
    expect(calm.flagged).toBe(false);
  });

  it("batch assesses rows", () => {
    const batch = batchAssess([{ oldAmount: 40, newAmount: 90 }]);
    expect(batch.flagged).toBe(1);
    expect(batch.live).toBe(false);
  });

  it("snapshot stays sandbox", () => {
    const snap = snapshot();
    expect(snap.live).toBe(false);
    expect(snap.sampleSpike).toBe(true);
  });
});