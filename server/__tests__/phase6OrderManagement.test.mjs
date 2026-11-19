import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { evaluatePhase6OrderManagement } = require("../lib/platform/phase6OrderManagement.js");

describe("phase 6 — order management", () => {
  it("reaches 100% dry-run order scope", () => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    process.env.BUZZARD_SUPPLIER_ORDERS_ENABLED = "0";
    const report = evaluatePhase6OrderManagement();
    expect(report.percentComplete).toBe(100);
    expect(report.ok).toBe(true);
  });
});