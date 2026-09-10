import type { AiTask, TaskContext, WorkerId } from "./types";
import { CUSTOMER_SAFE_CONTEXT_KEYS, SENSITIVE_CONTEXT_KEYS } from "./constants";

const WORKER_CONTEXT_ALLOWLIST: Partial<Record<WorkerId, Set<string>>> = {
  CUSTOMER_SERVICE_AI: CUSTOMER_SAFE_CONTEXT_KEYS,
  PRODUCT_AI: new Set([
    "productId",
    "market",
    "channel",
    "language",
    "engineOutputs",
    "metadata",
  ]),
  SUPPLIER_AI: new Set(["supplierId", "productId", "market", "engineOutputs", "metadata"]),
  PRICING_AI: new Set(["productId", "supplierId", "market", "channel", "engineOutputs", "metadata"]),
  INVENTORY_AI: new Set(["productId", "supplierId", "market", "engineOutputs", "metadata"]),
  ORDER_AI: new Set(["orderId", "customerId", "market", "channel", "engineOutputs", "metadata"]),
  MARKETPLACE_AI: new Set(["marketplaceId", "productId", "market", "engineOutputs", "metadata"]),
  CUSTOMS_AI: new Set(["orderId", "productId", "market", "engineOutputs", "metadata"]),
  RETURNS_AI: new Set(["returnId", "orderId", "market", "engineOutputs", "metadata"]),
  FINANCE_AI: new Set(["orderId", "returnId", "market", "engineOutputs", "metadata"]),
};

function stripSensitiveKeys(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_CONTEXT_KEYS.has(key)) continue;
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      result[key] = stripSensitiveKeys(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export function buildWorkerContext(task: AiTask): TaskContext {
  const allowlist = WORKER_CONTEXT_ALLOWLIST[task.workerId];
  const base = stripSensitiveKeys(task.context as Record<string, unknown>);

  if (!allowlist) {
    return base as TaskContext;
  }

  const filtered: TaskContext = {};
  for (const key of allowlist) {
    if (key in base) {
      (filtered as Record<string, unknown>)[key] = base[key];
    }
  }
  if (task.market) filtered.market = task.market;
  if (task.channel) filtered.channel = task.channel;
  if (task.language) filtered.language = task.language;

  return filtered;
}

export function validateContextSafety(context: TaskContext): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  for (const key of Object.keys(context)) {
    if (SENSITIVE_CONTEXT_KEYS.has(key)) {
      violations.push(`SENSITIVE_KEY:${key}`);
    }
  }
  if (context.engineOutputs) {
    for (const key of Object.keys(context.engineOutputs)) {
      if (SENSITIVE_CONTEXT_KEYS.has(key)) {
        violations.push(`SENSITIVE_ENGINE_OUTPUT:${key}`);
      }
    }
  }
  return { ok: violations.length === 0, violations };
}

export function sanitizeAiOutput(output: unknown): unknown {
  if (output === null || output === undefined) return output;
  if (typeof output !== "object") return output;
  if (Array.isArray(output)) return output.map(sanitizeAiOutput);
  const obj = output as Record<string, unknown>;
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_CONTEXT_KEYS.has(key)) continue;
    sanitized[key] = sanitizeAiOutput(value);
  }
  return sanitized;
}
