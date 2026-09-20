import { describe, it, expect, beforeEach } from "vitest";
import { createException, resetExceptionEngineForTests, shouldAutoRetry } from "./engine";
import { escalateExceptionToHumanApproval } from "./escalation";
import { resetHumanApprovalCenterForTests } from "@/lib/human-approval-center/center";

describe("exception-engine", () => {
  beforeEach(() => {
    resetExceptionEngineForTests();
    resetHumanApprovalCenterForTests();
  });

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

  it("escalates critical exceptions to human approval", () => {
    const ex = createException({
      category: "SECURITY_FAILURE",
      severity: "CRITICAL",
      entity: "auth",
      correlationId: "c2",
      rootCause: "anomaly",
    });
    const esc = escalateExceptionToHumanApproval(ex, "SYSTEM");
    expect(esc.ok).toBe(true);
    expect(esc.approvalId).toBeTruthy();
  });
});
