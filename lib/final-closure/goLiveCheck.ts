import { assertNoProductionBypass } from "./bypassGuard";
import { buildFinalClosureReport } from "./finalClosureReport";
import { evaluateFinalSalesEnablement } from "./salesEnablement";

export interface FinalGoLiveCheckResult {
  finalGoLive: "READY" | "BLOCKED";
  finalState: string;
  criticalBlockers: number;
  sales: "OPEN" | "CLOSED";
  checks: Array<{ domain: string; status: string }>;
  blockers: string[];
}

export function runFinalGoLiveCheck(): FinalGoLiveCheckResult {
  assertNoProductionBypass("FINAL_GO_LIVE_CHECK");

  const report = buildFinalClosureReport();
  const sales = evaluateFinalSalesEnablement();

  const checks = report.sections.map((s) => ({
    domain: s.section,
    status: s.status,
  }));

  return {
    finalGoLive: report.finalGoLive,
    finalState: report.finalState,
    criticalBlockers: report.criticalBlockerCount,
    sales: report.sales,
    checks,
    blockers: report.blockers.filter((b) => b.severity === "CRITICAL").map((b) => b.code),
  };
}
