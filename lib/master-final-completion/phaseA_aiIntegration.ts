import { AI_WORKERS } from "@/lib/ai-production/config";
import { discoverAllCapabilities } from "@/lib/ai-workers/capabilities";
import { getWorkerContract } from "@/lib/ai-workers/mockWorkers";
import { CONTEXT_FIELD_CLASSIFICATION } from "@/lib/ai-workers/constants";
import type { WorkerId } from "@/lib/ai-workers/types";
import type { PhaseReport } from "./types";

const REQUIRED_WORKERS: WorkerId[] = [
  "PRODUCT_AI",
  "SUPPLIER_AI",
  "PRICING_AI",
  "INVENTORY_AI",
  "ORDER_AI",
  "MARKETPLACE_AI",
  "CUSTOMS_AI",
  "CUSTOMER_SERVICE_AI",
  "RETURNS_AI",
  "FINANCE_AI",
];

export function evaluatePhaseA_aiIntegration(): PhaseReport {
  const blockers: string[] = [];
  const profiles = discoverAllCapabilities();

  for (const workerId of REQUIRED_WORKERS) {
    if (!AI_WORKERS.includes(workerId)) blockers.push(`MISSING_AI_WORKER:${workerId}`);
    const contract = getWorkerContract(workerId);
    if (!contract) {
      blockers.push(`MISSING_WORKER_CONTRACT:${workerId}`);
      continue;
    }
    const profile = profiles[workerId];
    if (!profile?.authorityLevel) {
      blockers.push(`MISSING_AUTHORITY:${workerId}`);
    } else if (profile.authorityLevel !== "RECOMMEND" && profile.authorityLevel !== "ANALYZE") {
      blockers.push(`UNSAFE_AUTHORITY:${workerId}`);
    }
    if (profile.supportedTaskTypes.length === 0) blockers.push(`NO_TASK_TYPES:${workerId}`);
  }

  const secretInContext = Object.entries(CONTEXT_FIELD_CLASSIFICATION).filter(([, c]) => c === "SECRET");
  if (secretInContext.length === 0) blockers.push("SECRET_CONTEXT_CLASSIFICATION_MISSING");

  const status = blockers.length === 0 ? "COMPLETE" : "BLOCKED";
  return {
    phase: "A",
    label: "AI Full Integration",
    status,
    tests: "test:ai-workers,test:ai-orchestrator,test:product-ai,test:ai-production",
    blockers,
  };
}
