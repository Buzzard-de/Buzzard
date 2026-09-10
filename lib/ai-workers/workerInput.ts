import type { AiTask } from "@/lib/ai-orchestrator/types";
import type { WorkerExecutionInput, WorkerId } from "./types";
import { WORKER_SUPPORTED_TASKS } from "./constants";
import { getWorkerCapabilityProfile } from "./capabilities";
import { validateNoSecretsInContext } from "./security";
import { getProvider, selectProvider } from "./providerRegistry";

export function validateWorkerInput(input: WorkerExecutionInput): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const { task, workerId } = input;

  if (!task.taskId) errors.push("MISSING_TASK_ID");
  if (!task.taskType) errors.push("MISSING_TASK_TYPE");
  if (task.workerId !== workerId) errors.push("WORKER_ID_MISMATCH");

  const supported = WORKER_SUPPORTED_TASKS[workerId];
  if (!supported?.includes(task.taskType)) {
    errors.push("UNSUPPORTED_TASK_TYPE");
  }

  if (!task.entityId && task.entityType !== "NONE") {
    errors.push("MISSING_ENTITY_ID");
  }

  if (task.context && !validateNoSecretsInContext(task.context as Record<string, unknown>)) {
    errors.push("SECRETS_IN_CONTEXT");
  }

  const profile = getWorkerCapabilityProfile(workerId);
  if (task.market && !profile.supportedMarkets.includes("*") && !profile.supportedMarkets.includes(task.market)) {
    errors.push("UNSUPPORTED_MARKET");
  }

  const providerSelection = selectProvider({
    workerId,
    taskType: task.taskType,
    market: task.market,
    language: task.language,
    latencyRequirementMs: input.timeoutMs,
  });
  if (!providerSelection.ok) {
    errors.push(providerSelection.errorCode ?? "NO_PROVIDER");
  } else {
    const provider = getProvider(providerSelection.providerId!);
    if (!provider?.definition.enabled) {
      errors.push("PROVIDER_DISABLED");
    }
  }

  return { ok: errors.length === 0, errors };
}

export function validateWorkerCompatibility(task: AiTask, workerId: WorkerId): boolean {
  return validateWorkerInput({ task, workerId }).ok;
}
