import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { runPhase11Evidence } = require("../lib/pim/phase11Evidence.js");
const { evaluatePhase11PimSot } = require("../lib/platform/phase11PimSot.js");

describe("phase 11 product source of truth", () => {
  it("keeps the canonical product inactive and rejects a duplicate EAN", () => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    const evidence = runPhase11Evidence();
    expect(evidence.code).not.toBe("REFUSED_PRODUCTION_DB");
    expect(evidence.failed).toEqual([]);
    expect(evidence.active).toBe(false);
    expect(evidence.validation.duplicate).toBe("duplicate_ean");
    expect(evidence.record.categoryId).toBe("cat-05");
    expect(evidence.record.collision).toBe("CONFLICT");
    expect(evidence.record.activation).not.toBe("ACTIVATED");
    expect(evidence.live).toBe(false);
    expect(evidence.ok).toBe(true);
  });

  it("does not use another phase percent as the source of truth", () => {
    const report = evaluatePhase11PimSot();
    expect(report.checks.map((check) => check.id)).not.toContain("PIM_SOT_PHASE3");
    expect(report.completeClaim).toBe(false);
    expect(report.live).toBe(false);
  });
});
