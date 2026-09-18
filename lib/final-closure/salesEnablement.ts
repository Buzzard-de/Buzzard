import { evaluateFinalOperationsSalesGate } from "@/lib/final-operations/salesGate";
import type { FinalSalesEnablementResult } from "./types";

/** Delegates to final-operations sales gate SSOT. */
export function evaluateFinalSalesEnablement(): FinalSalesEnablementResult {
  const gate = evaluateFinalOperationsSalesGate();
  return {
    allowed: gate.allowed,
    salesEnabled: gate.salesEnabled,
    blockers: gate.blockers,
    reasons: gate.blockers,
  };
}
