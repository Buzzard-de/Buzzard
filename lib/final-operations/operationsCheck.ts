import { assertNoProductionBypass } from "@/lib/final-closure/bypassGuard";
import { buildFinalOperationsReport, formatFinalOperationsReport } from "./operationsReport";
import { evaluateFinalOperationsSalesGate } from "./salesGate";

export function runFinalOperationsCheck(): {
  report: ReturnType<typeof buildFinalOperationsReport>;
  formatted: string;
  finalGoLive: "READY" | "BLOCKED";
  softwareComplete: true;
} {
  assertNoProductionBypass("FINAL_OPERATIONS_CHECK");

  const report = buildFinalOperationsReport();
  const salesGate = evaluateFinalOperationsSalesGate();

  return {
    report,
    formatted: formatFinalOperationsReport(report),
    finalGoLive: salesGate.finalGoLive,
    softwareComplete: true,
  };
}
