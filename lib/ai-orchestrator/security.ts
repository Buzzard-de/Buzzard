import type { AiTask } from "./types";
import { SERVER_ONLY_TASK_FIELDS, SENSITIVE_CONTEXT_KEYS } from "./constants";

const SECRET_PATTERN = /api[_-]?key|secret|password|token|authorization|bearer|credential|cvv|card/i;

export function rejectClientTaskModification(body: Record<string, unknown> = {}): {
  allowed: boolean;
  reason?: string;
} {
  for (const key of Object.keys(body)) {
    if (SECRET_PATTERN.test(key)) {
      return { allowed: false, reason: "CREDENTIALS_NOT_ALLOWED_ON_CLIENT" };
    }
    if (SERVER_ONLY_TASK_FIELDS.has(key)) {
      return { allowed: false, reason: "TASK_FIELDS_NOT_CLIENT_WRITABLE" };
    }
  }
  return { allowed: true };
}

export function canCustomerAccessTask(task: AiTask, requestCustomerId: string): boolean {
  const taskCustomerId = task.context.customerId;
  if (!taskCustomerId) return false;
  return taskCustomerId === requestCustomerId;
}

export function validateWorkerAuthorization(
  workerId: string,
  requestedWorkerId: string
): boolean {
  return workerId === requestedWorkerId;
}

export function sanitizeClientTaskPatch(
  existing: Record<string, unknown> = {},
  patch: Record<string, unknown> = {}
): Record<string, unknown> {
  const sanitized = { ...existing };
  for (const key of Object.keys(patch)) {
    if (!SERVER_ONLY_TASK_FIELDS.has(key) && !SECRET_PATTERN.test(key)) {
      sanitized[key] = patch[key];
    }
  }
  return sanitized;
}

export function containsSecrets(value: unknown): boolean {
  if (typeof value === "string") {
    return SECRET_PATTERN.test(value) || value.includes("sk-") || value.includes("Bearer ");
  }
  if (Array.isArray(value)) return value.some(containsSecrets);
  if (typeof value === "object" && value !== null) {
    for (const [key, val] of Object.entries(value)) {
      if (SECRET_PATTERN.test(key) || containsSecrets(val)) return true;
    }
  }
  return false;
}

export function validateNoSecretsInContext(context: Record<string, unknown>): boolean {
  for (const key of Object.keys(context)) {
    if (SENSITIVE_CONTEXT_KEYS.has(key) || SECRET_PATTERN.test(key)) return false;
    if (containsSecrets(context[key])) return false;
  }
  return true;
}
