import type { FirstOrderEvidence, GoLiveCheckResult } from "./types";

export function validateSupplierConfirmation(
  evidence: FirstOrderEvidence,
  options?: { mockConfirmed?: boolean },
): { level: GoLiveCheckResult["level"]; blockers: string[]; message: string } {
  const blockers: string[] = [];

  if (!evidence.supplierOrderReference) {
    blockers.push("SUPPLIER_CONFIRMATION_MISSING_REF");
    return { level: "BLOCKED", blockers, message: "No supplier reference" };
  }

  if (evidence.executionResult === "UNKNOWN_OUTCOME") {
    blockers.push("SUPPLIER_CONFIRMATION_UNKNOWN");
    return { level: "FAIL", blockers, message: "Unknown outcome" };
  }

  const mockMode =
    options?.mockConfirmed ||
    evidence.mockExecution ||
    process.env.SUPPLIER_GO_LIVE_MOCK === "1";

  if (mockMode) {
    return { level: "PASS", blockers: [], message: `Mock confirmed ${evidence.supplierOrderReference}` };
  }

  blockers.push("SUPPLIER_CONFIRMATION_REQUIRES_LIVE_STATUS");
  return { level: "UNVERIFIED", blockers, message: "Live supplier status check required" };
}
