import type { AiTask } from "@/lib/ai-orchestrator/types";
import type { WorkerContext, WorkerId } from "./types";
import { CONTEXT_FIELD_CLASSIFICATION, WORKER_CONTEXT_ALLOWLIST } from "./constants";
import { validateContextPermissions } from "./permissions";

export function buildScopedWorkerContext(task: AiTask, workerId: WorkerId): {
  context: WorkerContext;
  scope: string[];
} {
  const allowlist = WORKER_CONTEXT_ALLOWLIST[workerId];
  const raw = task.context as WorkerContext;
  const scoped: WorkerContext = {};
  const scope: string[] = [];

  for (const key of allowlist) {
    const val = raw[key as keyof WorkerContext];
    if (val === undefined) continue;

    const classification = CONTEXT_FIELD_CLASSIFICATION[key] ?? "INTERNAL";
    if (classification === "SECRET") continue;

    if (key === "engineOutputs" && typeof val === "object" && val !== null) {
      const filtered: Record<string, unknown> = {};
      for (const [subKey, subVal] of Object.entries(val as Record<string, unknown>)) {
        const subClass = CONTEXT_FIELD_CLASSIFICATION[subKey] ?? "INTERNAL";
        if (subClass === "SECRET") continue;
        if (workerId === "CUSTOMER_SERVICE_AI" && !["orderStatus", "shipmentStatus", "returnStatus", "refundStatus", "refundAmount", "productName"].includes(subKey)) {
          continue;
        }
        if (["FINANCIAL", "SENSITIVE"].includes(subClass) && workerId === "CUSTOMER_SERVICE_AI") {
          continue;
        }
        filtered[subKey] = subVal;
        scope.push(`engineOutputs.${subKey}`);
      }
      if (Object.keys(filtered).length > 0) {
        scoped.engineOutputs = filtered;
      }
      continue;
    }

    (scoped as Record<string, unknown>)[key] = val;
    scope.push(key);
  }

  if (task.market) scoped.market = task.market;
  if (task.channel) scoped.channel = task.channel;
  if (task.language) scoped.language = task.language;

  return { context: scoped, scope };
}

export function validateContextScope(workerId: WorkerId, context: WorkerContext): { ok: boolean; errors: string[] } {
  const permissionCheck = validateContextPermissions(workerId, context);
  if (!permissionCheck.ok) {
    return { ok: false, errors: permissionCheck.violations };
  }

  const errors: string[] = [];
  for (const key of Object.keys(context)) {
    const classification = CONTEXT_FIELD_CLASSIFICATION[key];
    if (classification === "SECRET") {
      errors.push(`SECRET_FIELD:${key}`);
    }
  }

  return { ok: errors.length === 0, errors };
}
