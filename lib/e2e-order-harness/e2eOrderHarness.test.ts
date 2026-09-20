import { describe, it, expect } from "vitest";
import { evaluateProductionE2eGate, formatE2eTestOrderId, resolveDefaultE2eMode } from "./gate";
import { AUTO_RESTOCK_POLICY } from "./types";

describe("e2e-order-harness", () => {
  it("defaults to LOCAL and blocks controlled production", () => {
    expect(resolveDefaultE2eMode()).toBe("LOCAL");
    expect(evaluateProductionE2eGate().allowed).toBe(false);
  });

  it("marks test orders distinctly", () => {
    expect(formatE2eTestOrderId("x")).toMatch(/^E2E_TEST-/);
  });

  it("forbids auto-restock policy", () => {
    expect(AUTO_RESTOCK_POLICY).toBe("FORBIDDEN");
  });
});
