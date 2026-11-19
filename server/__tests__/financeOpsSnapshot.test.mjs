import { describe, expect, it } from "vitest";

const { snapshot } = require("../lib/finance/financeOpsSnapshot.js");

describe("finance ops snapshot", () => {
  it("exposes tax pools without live filing", () => {
    const snap = snapshot();
    expect(snap.live).toBe(false);
    expect(snap.ab27Countries).toBe(27);
    expect(snap.taxConnect.filingLive).toBe(false);
    expect(snap.taxPools.paymentAuthority).toBe(false);
  });
});