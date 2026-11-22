import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { runPhase9Evidence } = require("../lib/storefront/phase9Evidence.js");
const { evaluatePhase9TextileAi } = require("../lib/platform/phase9TextileAi.js");

describe("phase 9 textile integration", () => {
  it("recommends from measurements and refuses a live try-on", () => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    const evidence = runPhase9Evidence();
    expect(evidence.workwear).toBe("workwear");
    expect(evidence.unknown).toBe("daily");
    expect(evidence.missing).toBe("NO_MEASUREMENTS");
    expect(evidence.size).toBe("M_ESTIMATE");
    expect(evidence.tryOn).toBe(false);
    expect(evidence.image).toBe("BLOCKED");
    expect(evidence.live).toBe(false);
    expect(evidence.ok).toBe(true);
  });

  it("keeps the live vision model blocked", () => {
    const report = evaluatePhase9TextileAi();
    expect(report.blockedExternal).toContain("TEX_LIVE_TRYON");
    expect(report.completeClaim).toBe(false);
  });
});
