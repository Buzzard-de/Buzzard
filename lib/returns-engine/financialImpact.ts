import { getReconciliation } from "./registry";
import { reconcileReturnFinancials } from "./reconciliation";

export function getFinalOrderContribution(returnId: string): {
  originalOrderMargin: number;
  returnImpact: number;
  finalOrderContribution: number;
} | undefined {
  let rec = getReconciliation(returnId);
  if (!rec) rec = reconcileReturnFinancials(returnId);
  if (!rec) return undefined;

  return {
    originalOrderMargin: rec.originalOrderMargin,
    returnImpact: rec.returnImpact,
    finalOrderContribution: rec.finalOrderContribution,
  };
}

export function documentEstimatedVsActual(): string {
  return [
    "Pricing Engine return reserve = expected risk (estimate)",
    "Returns Engine financial impact = actual outcome",
    "Supplier reimbursement must never be assumed unless actually confirmed/received",
  ].join("\n");
}
