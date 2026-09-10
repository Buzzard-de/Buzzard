import type { AiRecommendation, AiTask, AuthorityLevel, TaskType } from "./types";
import { TASK_TYPE_AUTHORITY } from "./constants";
import { getWorker } from "./workerRegistry";

const AUTHORITY_RANK: Record<AuthorityLevel, number> = {
  OBSERVE: 1,
  ANALYZE: 2,
  RECOMMEND: 3,
  EXECUTE_LOW_RISK: 4,
  EXECUTE_WITH_APPROVAL: 5,
  NEVER_EXECUTE: 0,
};

export function getRequiredAuthority(taskType: TaskType): AuthorityLevel {
  return TASK_TYPE_AUTHORITY[taskType] ?? "ANALYZE";
}

export function hasAuthority(
  workerAuthority: AuthorityLevel,
  requiredAuthority: AuthorityLevel
): boolean {
  if (workerAuthority === "NEVER_EXECUTE") return requiredAuthority === "OBSERVE" || requiredAuthority === "ANALYZE";
  return AUTHORITY_RANK[workerAuthority] >= AUTHORITY_RANK[requiredAuthority];
}

export function validateWorkerAuthority(task: AiTask): { ok: boolean; errorCode?: string } {
  const worker = getWorker(task.workerId);
  if (!worker) return { ok: false, errorCode: "WORKER_NOT_FOUND" };
  if (!worker.enabled) return { ok: false, errorCode: "WORKER_DISABLED" };
  if (worker.healthStatus === "UNHEALTHY" || worker.healthStatus === "DISABLED") {
    return { ok: false, errorCode: "WORKER_UNHEALTHY" };
  }

  const required = getRequiredAuthority(task.taskType);
  if (!hasAuthority(worker.authorityLevel, required)) {
    return { ok: false, errorCode: "AUTHORITY_VIOLATION" };
  }
  if (!worker.supportedTaskTypes.includes(task.taskType)) {
    return { ok: false, errorCode: "UNSUPPORTED_TASK_TYPE" };
  }
  return { ok: true };
}

export function canExecuteRecommendation(
  recommendation: AiRecommendation,
  workerAuthority: AuthorityLevel
): boolean {
  if (recommendation.deterministicValidationRequired) return false;
  if (recommendation.requiredApproval) return false;
  if (!hasAuthority(workerAuthority, recommendation.authorityRequired)) return false;
  if (recommendation.authorityRequired === "EXECUTE_WITH_APPROVAL") return false;
  if (recommendation.authorityRequired === "NEVER_EXECUTE") return false;
  return recommendation.authorityRequired === "EXECUTE_LOW_RISK";
}

export function validateDeterministicRule(
  task: AiTask,
  recommendation: AiRecommendation
): {
  validationStatus: "PASSED" | "FAILED" | "NOT_REQUIRED";
  validationErrors: string[];
  finalDecision: "ALLOW" | "REJECT" | "ESCALATE" | "PENDING";
} {
  if (!recommendation.deterministicValidationRequired) {
    return { validationStatus: "NOT_REQUIRED", validationErrors: [], finalDecision: "ALLOW" };
  }

  const errors: string[] = [];

  if (task.taskType === "PRICE_RECOMMENDATION") {
    const rec = recommendation.recommendation as { price?: number } | undefined;
    if (rec?.price !== undefined && rec.price <= 0) {
      errors.push("PRICE_MUST_BE_POSITIVE");
    }
  }

  if (task.taskType === "FINANCIAL_RECONCILIATION") {
    const rec = recommendation.recommendation as { overwriteHistorical?: boolean } | undefined;
    if (rec?.overwriteHistorical) {
      errors.push("CANNOT_OVERWRITE_HISTORICAL_FINANCIAL_DATA");
    }
  }

  if (task.taskType === "ORDER_ANALYSIS") {
    const rec = recommendation.recommendation as { modifyOrderDirectly?: boolean } | undefined;
    if (rec?.modifyOrderDirectly) {
      errors.push("ORDER_ENGINE_MUST_PERFORM_TRANSITIONS");
    }
  }

  if (errors.length > 0) {
    return { validationStatus: "FAILED", validationErrors: errors, finalDecision: "REJECT" };
  }

  if (recommendation.requiredApproval) {
    return { validationStatus: "PASSED", validationErrors: [], finalDecision: "PENDING" };
  }

  return { validationStatus: "PASSED", validationErrors: [], finalDecision: "ALLOW" };
}
