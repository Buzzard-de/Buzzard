import { auditAiWorkerRegistry } from "@/lib/ai-workers/workerRegistryAudit";
import type { PhaseReport } from "./types";

export function evaluatePhaseA_aiIntegration(): PhaseReport {
  const audit = auditAiWorkerRegistry();
  const blockers = [
    ...audit.globalBlockers,
    ...audit.rows.filter((r) => !r.ok).map((r) => `WORKER_AUDIT:${r.workerId}:${r.missing.join(",")}`),
  ];

  const status = blockers.length === 0 ? "COMPLETE" : "BLOCKED";
  return {
    phase: "A",
    label: "AI Full Integration",
    status,
    tests: "test:ai-workers,test:ai-orchestrator,test:product-ai,test:ai-production",
    blockers,
  };
}
