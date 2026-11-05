import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { runIsolatedDisasterDrill } = require("../lib/survival/isolatedDisasterDrill.js");

describe("isolated disaster drill", () => {
  it("restores synthetic commerce data without production touch or live payment", () => {
    const result = runIsolatedDisasterDrill();
    expect(result.status).toBe("ISOLATED_RESTORE_TESTED");
    expect(result.productionDrVerified).toBe(false);
    expect(result.productionTouched).toBe(false);
    expect(result.worm).toBe("BLOCKED");
    expect(result.flows.taxPayDenied).toBe(true);
    expect(result.flows.paidFlag).toBe(true);
    expect(result.flows.orderCancelled).toBe(true);
  });
});
