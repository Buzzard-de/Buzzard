import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { runPhase8Evidence } = require("../lib/logistics/phase8Evidence.js");
const { evaluatePhase8Logistics } = require("../lib/platform/phase8Logistics.js");

describe("phase 8 logistics integration", () => {
  it("validates five carrier adapters without buying a label", () => {
    const evidence = runPhase8Evidence();
    expect(evidence.carriers.brands).toEqual(["DHL", "DPD", "GLS", "Hermes", "UPS"]);
    expect(evidence.carriers.folded).toBe("FAILED");
    expect(evidence.country.quote).toBe("UNKNOWN");
    expect(evidence.country.returnState).toBe("RETURN_REQUESTED");
    expect(evidence.live).toBe(false);
    expect(evidence.ok).toBe(true);
  });

  it("keeps live carrier rates blocked", () => {
    const report = evaluatePhase8Logistics();
    expect(report.checks.find((check) => check.id === "LOG_LIVE_RATES").status).toBe("BLOCKED_EXTERNAL");
    expect(report.completeClaim).toBe(false);
  });
});
