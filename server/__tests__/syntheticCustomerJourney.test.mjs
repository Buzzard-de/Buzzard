import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { runSyntheticCustomerJourney, STEP_IDS } = require("../lib/commerce/syntheticCustomerJourney.js");

describe("synthetic customer journey", () => {
  it("runs all seventeen dry-run steps with sales locked", () => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    const journey = runSyntheticCustomerJourney();
    expect(journey.stepCount).toBe(STEP_IDS.length);
    expect(journey.failedSteps).toEqual([]);
    expect(journey.ok).toBe(true);
    expect(journey.live).toBe(false);
    expect(journey.paymentCaptured).toBe(false);
    expect(journey.supplierPurchase).toBe(false);
  });
});