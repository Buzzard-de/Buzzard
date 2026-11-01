import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { buildScorecard } = require("../lib/ecosystem/scorecard.js");
const { assess, submitFiling } = require("../lib/commerce/taxConnect.js");

describe("ecosystem scorecard and closable gaps", () => {
  it("never claims 100% COMPLETE while blockers remain", () => {
    const card = buildScorecard();
    expect(card.completeClaim).toBe(false);
    expect(card.salesEnabled).toBe(false);
    expect(card.percent).toBeGreaterThanOrEqual(45);
    expect(card.percent).toBeLessThan(100);
    expect(card.blocked.map((i) => i.id)).toEqual(
      expect.arrayContaining(["offsite_32110", "voice", "e2e_crypto", "sales_payments", "merge_deploy"])
    );
  });

  it("blocks Tax Connect filing without credentials", () => {
    expect(assess().status).toBe("BLOCKED");
    expect(submitFiling().ok).toBe(false);
  });
});
