import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { evaluatePhase3ProductPim } = require("../lib/platform/phase3ProductPim.js");

describe("phase 3 — product PIM", () => {
  it("reaches 100% on dry-run PIM scope", () => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    const report = evaluatePhase3ProductPim();
    expect(report.percentComplete).toBe(100);
    expect(report.ok).toBe(true);
    const dry = report.checks.find((check) => check.id === "PIM_DRY_IMPORT");
    const invalid = report.checks.find((check) => check.id === "PIM_DRY_IMPORT_INVALID");
    expect(dry.ok).toBe(true);
    expect(dry.liveImport).toBe(false);
    expect(invalid.ok).toBe(true);
    const live = report.checks.find((check) => check.id === "PIM_LIVE_PUBLISH");
    expect(live.status).toBe("BLOCKED_EXTERNAL");
    expect(live.ok).toBe(false);
    expect(report.completeClaim).toBe(false);
  });
});