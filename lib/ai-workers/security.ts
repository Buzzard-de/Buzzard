import type { WorkerId } from "./types";

const SECRET_PATTERN = /api[_-]?key|secret|password|token|authorization|bearer|credential|cvv|card/i;

const SERVER_ONLY_FIELDS = new Set([
  "validationStatus",
  "deterministicValidation",
  "recommendation",
  "confidence",
  "authorityRequired",
]);

export function validateNoSecretsInContext(context: Record<string, unknown>): boolean {
  for (const [key, value] of Object.entries(context)) {
    if (SECRET_PATTERN.test(key)) return false;
    if (typeof value === "string" && SECRET_PATTERN.test(value)) return false;
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      if (!validateNoSecretsInContext(value as Record<string, unknown>)) return false;
    }
  }
  return true;
}

export function rejectClientExecutionModification(body: Record<string, unknown> = {}): {
  allowed: boolean;
  reason?: string;
} {
  for (const key of Object.keys(body)) {
    if (SECRET_PATTERN.test(key)) {
      return { allowed: false, reason: "CREDENTIALS_NOT_ALLOWED" };
    }
    if (SERVER_ONLY_FIELDS.has(key)) {
      return { allowed: false, reason: "EXECUTION_FIELDS_NOT_CLIENT_WRITABLE" };
    }
  }
  return { allowed: true };
}

export function validateWorkerIdentity(requestedWorkerId: WorkerId, actualWorkerId: WorkerId): boolean {
  return requestedWorkerId === actualWorkerId;
}

export function validateProviderIdentity(requestedProviderId: string, actualProviderId: string): boolean {
  return requestedProviderId === actualProviderId;
}

export function canAccessEntity(
  workerId: WorkerId,
  entityType: string,
  entityId: string,
  allowedEntityId?: string
): boolean {
  if (!allowedEntityId) return true;
  return entityId === allowedEntityId;
}
