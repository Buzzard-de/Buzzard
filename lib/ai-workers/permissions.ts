import type { ContextClassification, WorkerContext, WorkerId, WorkerPermission } from "./types";
import { CONTEXT_FIELD_CLASSIFICATION, WORKER_PERMISSIONS } from "./constants";

const PERMISSION_FOR_CLASSIFICATION: Partial<Record<ContextClassification, WorkerPermission[]>> = {
  FINANCIAL: ["READ_FINANCIAL"],
  SENSITIVE: ["READ_ORDER", "CUSTOMER_SAFE_DATA"],
  INTERNAL: ["READ_PRODUCT", "READ_SUPPLIER", "READ_ORDER", "READ_RETURN", "READ_MARKETPLACE", "READ_INVENTORY", "READ_PRICING"],
};

export function getWorkerPermissions(workerId: WorkerId): WorkerPermission[] {
  return WORKER_PERMISSIONS[workerId] ?? [];
}

export function hasPermission(workerId: WorkerId, permission: WorkerPermission): boolean {
  return getWorkerPermissions(workerId).includes(permission);
}

export function canAccessContextField(workerId: WorkerId, field: string): boolean {
  const classification = CONTEXT_FIELD_CLASSIFICATION[field] ?? "INTERNAL";
  if (classification === "SECRET") return false;
  if (classification === "PUBLIC") return true;
  if (classification === "CUSTOMER_SAFE") {
    return workerId === "CUSTOMER_SERVICE_AI" || hasPermission(workerId, "CUSTOMER_SAFE_DATA");
  }

  const required = PERMISSION_FOR_CLASSIFICATION[classification] ?? [];
  if (required.length === 0) return true;
  return required.some((p) => hasPermission(workerId, p));
}

export function validateContextPermissions(
  workerId: WorkerId,
  context: WorkerContext
): { ok: boolean; violations: string[] } {
  const violations: string[] = [];

  for (const key of Object.keys(context)) {
    if (key === "engineOutputs" && context.engineOutputs) {
      for (const subKey of Object.keys(context.engineOutputs)) {
        if (!canAccessContextField(workerId, subKey)) {
          violations.push(`UNAUTHORIZED_FIELD:engineOutputs.${subKey}`);
        }
      }
      continue;
    }
    if (!canAccessContextField(workerId, key)) {
      violations.push(`UNAUTHORIZED_FIELD:${key}`);
    }
  }

  return { ok: violations.length === 0, violations };
}
