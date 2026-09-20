import { buildMasterExternalProviderReadinessReport } from "@/lib/master-external-provider-readiness/masterReadinessReport";
import { buildExternalAccessControlCenterReport } from "@/lib/external-access-control-center/controlCenterReport";
import type { PhaseReport } from "./types";

export function buildFinalDependencyGraph(): Array<{ step: string; status: string; blockingReason?: string }> {
  return [
    { step: "SOFTWARE_COMPLETE", status: "COMPLETE" },
    { step: "INTERNAL_INTEGRATION_COMPLETE", status: "COMPLETE" },
    { step: "EXTERNAL_ACCESS", status: "HUMAN_REQUIRED", blockingReason: "Credentials and evidence" },
    { step: "LIVE_VALIDATION", status: "BLOCKED", blockingReason: "No live evidence" },
    { step: "SECURITY", status: "HUMAN_REQUIRED" },
    { step: "HUMAN_APPROVAL", status: "HUMAN_REQUIRED" },
    { step: "FIRST_ORDER", status: "BLOCKED_EXTERNAL_ACCESS" },
    { step: "POST_ORDER_VALIDATION", status: "BLOCKED" },
    { step: "OBSERVATION", status: "BLOCKED" },
    { step: "FINAL_GO_LIVE", status: "BLOCKED" },
    { step: "SALES_ENABLEMENT", status: "BLOCKED", blockingReason: "Explicit operator action only" },
  ];
}

export function evaluatePhaseF_goLive(): PhaseReport {
  const blockers: string[] = [];
  const external = buildMasterExternalProviderReadinessReport();
  const control = buildExternalAccessControlCenterReport();

  if (external.scoreboard.PRODUCTION === "VALIDATED") blockers.push("PRODUCTION_VALIDATED_WITHOUT_EVIDENCE");
  if (external.scoreboard.GO_LIVE === "VALIDATED") blockers.push("GO_LIVE_VALIDATED_WITHOUT_EVIDENCE");
  if (external.scoreboard.SALES !== "DISABLED") blockers.push("SALES_NOT_DISABLED");
  if (control.scoreboard?.PRODUCTION === "VALIDATED") blockers.push("CONTROL_CENTER_PRODUCTION_FAKE");

  const graph = buildFinalDependencyGraph();
  const salesStep = graph.find((s) => s.step === "SALES_ENABLEMENT");
  if (salesStep?.status !== "BLOCKED") blockers.push("SALES_ENABLEMENT_NOT_BLOCKED");

  return {
    phase: "F",
    label: "Final Go-Live Consolidation",
    status: blockers.length === 0 ? "HUMAN_REQUIRED" : "BLOCKED",
    tests: "test:master-final-completion,gate:final-buzzard-completion,status:buzzard-final",
    blockers,
  };
}
