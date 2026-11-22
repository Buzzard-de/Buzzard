import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { evaluatePhase2CategoryInfrastructure } = require("../lib/platform/phase2CategoryInfrastructure.js");

describe("phase 2 — category infrastructure", () => {
  it("reaches 100% on category/filter software scope", () => {
    const report = evaluatePhase2CategoryInfrastructure();
    expect(report.percentComplete).toBe(100);
    expect(report.ok).toBe(true);
    for (const check of report.checks) {
      expect(check.ok, check.id).toBe(true);
    }
    expect(report.checks.find((check) => check.id === "CAT_SUPPLIER_BRAKES_ALIAS").mapped).toBe("automotive/bremssystem");
    expect(report.checks.find((check) => check.id === "CAT_TAXONOMY_50").master50).toBe(50);
    expect(report.checks.find((check) => check.id === "CAT_L1_TEMPLATES_50").templateL1).toBe(50);
    expect(report.checks.find((check) => check.id === "CAT_L2_PROFILES_330").l2Count).toBe(330);
    expect(report.completeClaim).toBe(false);
  });
});