import { AI_WORKERS } from "@/lib/ai-production/config";
import {
  CONTEXT_FIELD_CLASSIFICATION,
  DEFAULT_EXECUTION_TIMEOUT_MS,
  FORBIDDEN_WORKER_ACTIONS,
  INPUT_SCHEMA_VERSION,
  OUTPUT_SCHEMA_VERSION,
  WORKER_CONTEXT_ALLOWLIST,
  WORKER_SUPPORTED_TASKS,
} from "./constants";
import { discoverAllCapabilities } from "./capabilities";
import { getWorkerContract } from "./mockWorkers";
import { runDeterministicValidation } from "./validation";
import type { WorkerId } from "./types";

export interface WorkerRegistryAuditRow {
  workerId: WorkerId;
  ok: boolean;
  missing: string[];
}

export function auditAiWorkerRegistry(): {
  ok: boolean;
  rows: WorkerRegistryAuditRow[];
  globalBlockers: string[];
} {
  const profiles = discoverAllCapabilities();
  const rows: WorkerRegistryAuditRow[] = [];

  for (const workerId of AI_WORKERS) {
    const missing: string[] = [];
    const contract = getWorkerContract(workerId);
    const profile = profiles[workerId];

    if (!contract) missing.push("engineAdapter");
    if (!profile) missing.push("capabilities");
    else {
      if (!profile.authorityLevel) missing.push("authority");
      if (profile.supportedTaskTypes.length === 0) missing.push("inputSchema");
      if (!profile.version) missing.push("fallback");
    }
    if (!(WORKER_SUPPORTED_TASKS[workerId]?.length > 0)) missing.push("inputSchema");
    if (!WORKER_CONTEXT_ALLOWLIST[workerId]?.size) missing.push("contextClass");
    if (!INPUT_SCHEMA_VERSION || !OUTPUT_SCHEMA_VERSION) missing.push("outputSchema");
    if (DEFAULT_EXECUTION_TIMEOUT_MS <= 0) missing.push("timeout");
    if (!runDeterministicValidation) missing.push("engineAdapter");
    else {
      const probe = runDeterministicValidation({
        workerId,
        taskType: WORKER_SUPPORTED_TASKS[workerId]![0],
        output: {
          recommendation: {},
          confidence: 0.5,
          authorityRequired: profile?.authorityLevel ?? "ANALYZE",
          requiredApproval: false,
          deterministicValidationRequired: true,
          reasoningSummary: "audit",
        },
        context: { metadata: {} },
      });
      if (!probe.validatedBy.includes("_engine_adapter")) missing.push("engineAdapter");
    }
    if (profile && profile.authorityLevel !== "RECOMMEND" && profile.authorityLevel !== "ANALYZE") {
      missing.push("sideEffectPolicy");
    }
    if (FORBIDDEN_WORKER_ACTIONS.size === 0) missing.push("sideEffectPolicy");

    rows.push({ workerId, ok: missing.length === 0, missing });
  }

  const globalBlockers: string[] = [];
  const secretFields = Object.values(CONTEXT_FIELD_CLASSIFICATION).filter((c) => c === "SECRET");
  if (secretFields.length === 0) globalBlockers.push("SECRET_CONTEXT_CLASSIFICATION_MISSING");

  return { ok: rows.every((r) => r.ok) && globalBlockers.length === 0, rows, globalBlockers };
}
