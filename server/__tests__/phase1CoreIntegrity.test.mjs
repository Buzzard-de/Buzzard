import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { evaluatePhase1CoreIntegrity, checkProtectedDataIntegrity } = require("../lib/platform/phase1CoreIntegrity.js");

describe("phase 1 — core system and data integrity", () => {
  it("reaches 100% on software-completable checks", () => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    const report = evaluatePhase1CoreIntegrity();
    expect(report.percentComplete).toBe(100);
    expect(report.ok).toBe(true);
    expect(report.invariants.salesLocked).toBe(true);
    expect(report.invariants.egressDeny).toBe(true);
    for (const check of report.checks) {
      expect(check.ok, check.id).toBe(true);
    }
  });

  it("protected server/data JSON stores match baseline", () => {
    const data = checkProtectedDataIntegrity();
    expect(data.missing).toEqual([]);
    expect(data.jsonHashMismatch).toEqual([]);
    expect(data.ok).toBe(true);
  });
});