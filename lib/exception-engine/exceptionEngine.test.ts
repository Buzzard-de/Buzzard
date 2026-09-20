import { describe, it, expect, beforeEach } from "vitest";
import { createException, resetExceptionEngineForTests, shouldAutoRetry } from "./engine";

describe("exception-engine", () => {
  beforeEach(() => resetExceptionEngineForTests());

  it("never auto-retries unknown external outcomes", () => {
    const ex = createException({
      category: "UNKNOWN_EXTERNAL_OUTCOME",
      severity: "CRITICAL",
      entity: "supplier-order:1",
      correlationId: "c1",
      rootCause: "timeout",
    });
    expect(ex.retryPolicy).toBe("HUMAN_REQUIRED");
    expect(shouldAutoRetry(ex)).toBe(false);
  });
});
