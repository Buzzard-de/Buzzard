import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { evaluatePhase6OrderManagement } = require("../lib/platform/phase6OrderManagement.js");

describe("phase 6 — order management", () => {
  it("dry-run order scope stays locked while a missing cancel is rejected", () => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    process.env.BUZZARD_SUPPLIER_ORDERS_ENABLED = "0";
    const report = evaluatePhase6OrderManagement();
    expect(report.evidence.tracked).toBe(true);
    expect(report.evidence.cancelled).toBe(true);
    expect(report.evidence.missingCancel).toBe("MISSING_ORDER_ID");
    expect(report.evidence.unknownCancel).toBe("ORDER_NOT_FOUND");
    expect(report.blockedExternal).toContain("ORD_LIVE_SUBMIT");
    expect(report.completeClaim).toBe(false);
    expect(report.live).toBe(false);
    expect(report.ok).toBe(true);
    expect(report.percentComplete).toBe(100);
  });
});