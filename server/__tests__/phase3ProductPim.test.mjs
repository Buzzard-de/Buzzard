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
  });
});