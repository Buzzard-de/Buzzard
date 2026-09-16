import type { FirstOrderEvidence, GoLiveCheckResult } from "./types";

export function reconcileFulfillment(input: {
  evidence: FirstOrderEvidence;
  mockPass?: boolean;
}): { level: GoLiveCheckResult["level"]; blockers: string[]; checks: GoLiveCheckResult[] } {
  const checks: GoLiveCheckResult[] = [];
  const blockers: string[] = [];

  if (!input.evidence.supplierOrderReference) {
    blockers.push("FCT_SUPPLIER_ORDER_MISSING");
    checks.push({ check: "FCT_SUPPLIER_ORDER", category: "FCT", level: "BLOCKED", message: "No supplier order" });
    return { level: "FAIL", blockers, checks };
  }

  const mockPass = input.mockPass || input.evidence.mockExecution || process.env.SUPPLIER_GO_LIVE_MOCK === "1";

  checks.push({
    check: "FCT_ORDER",
    category: "FCT",
    level: mockPass ? "PASS" : "UNVERIFIED",
    message: mockPass ? "Order aligned" : "FCT reconciliation requires live data",
  });
  checks.push({
    check: "FCT_INVENTORY",
    category: "FCT",
    level: mockPass ? "PASS" : "UNVERIFIED",
    message: mockPass ? "Reservation aligned" : "Inventory reconciliation pending",
  });
  checks.push({
    check: "FCT_SUPPLIER_ASSIGNMENT",
    category: "FCT",
    level: mockPass ? "PASS" : "UNVERIFIED",
    message: mockPass ? "Supplier assignment aligned" : "Assignment pending",
  });

  if (!mockPass) {
    blockers.push("FCT_RECONCILIATION_NOT_AVAILABLE");
    return { level: "UNVERIFIED", blockers, checks };
  }

  if (blockers.length > 0) return { level: "FAIL", blockers, checks };
  return { level: "PASS", blockers, checks };
}

export function reconcileInventory(input: {
  evidence: FirstOrderEvidence;
  mockPass?: boolean;
}): GoLiveCheckResult {
  const mockPass = input.mockPass || input.evidence.mockExecution || process.env.SUPPLIER_GO_LIVE_MOCK === "1";
  if (!mockPass) {
    return { check: "INVENTORY", category: "INVENTORY", level: "UNVERIFIED", message: "Live inventory check required" };
  }
  return { check: "INVENTORY", category: "INVENTORY", level: "PASS", message: "Reservation matches accepted quantity" };
}

export function reconcilePricing(input: {
  evidence: FirstOrderEvidence;
  mockPass?: boolean;
}): GoLiveCheckResult {
  const mockPass = input.mockPass || input.evidence.mockExecution || process.env.SUPPLIER_GO_LIVE_MOCK === "1";
  if (!mockPass) {
    return { check: "PRICING", category: "PRICING", level: "UNVERIFIED", message: "Pricing snapshot reconciliation pending" };
  }
  return { check: "PRICING", category: "PRICING", level: "PASS", message: "Price snapshot aligned" };
}

export function reconcileFinancial(input: {
  evidence: FirstOrderEvidence;
  mockPass?: boolean;
}): { level: GoLiveCheckResult["level"]; blockers: string[]; check: GoLiveCheckResult } {
  const mockPass = input.mockPass || input.evidence.mockExecution || process.env.SUPPLIER_GO_LIVE_MOCK === "1";
  if (!mockPass) {
    return {
      level: "UNVERIFIED",
      blockers: ["FINANCIAL_RECONCILIATION_NOT_AVAILABLE"],
      check: { check: "FINANCIAL", category: "FINANCIAL", level: "UNVERIFIED", message: "Financial reconciliation pending" },
    };
  }
  return {
    level: "PASS",
    blockers: [],
    check: { check: "FINANCIAL", category: "FINANCIAL", level: "PASS", message: "Contribution within expected bounds" },
  };
}
