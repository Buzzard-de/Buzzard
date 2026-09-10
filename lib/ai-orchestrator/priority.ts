import type { PriorityInput, TaskPriority } from "./types";
import { PRIORITY_WEIGHTS } from "./constants";

export function calculateTaskPriority(input: PriorityInput = {}): TaskPriority {
  let score = 0;

  if (input.customerImpact) score += input.customerImpact * PRIORITY_WEIGHTS.customerImpact;
  if (input.financialImpact) score += input.financialImpact * PRIORITY_WEIGHTS.financialImpact;
  if (input.orderUrgency) score += input.orderUrgency * PRIORITY_WEIGHTS.orderUrgency;
  if (input.inventoryRisk) score += input.inventoryRisk * PRIORITY_WEIGHTS.inventoryRisk;
  if (input.supplierFailure) score += PRIORITY_WEIGHTS.supplierFailure;
  if (input.marketplaceSla) score += PRIORITY_WEIGHTS.marketplaceSla;
  if (input.returnRefundUrgency) score += PRIORITY_WEIGHTS.returnRefundUrgency;
  if (input.complianceRisk) score += PRIORITY_WEIGHTS.complianceRisk;
  if (input.dependencyBlocking) score += PRIORITY_WEIGHTS.dependencyBlocking;
  if (input.systemHealth === "DEGRADED" || input.systemHealth === "UNHEALTHY") {
    score += PRIORITY_WEIGHTS.systemHealthDegraded;
  }

  if (score >= 80) return "CRITICAL";
  if (score >= 50) return "HIGH";
  if (score >= 20) return "NORMAL";
  if (score >= 5) return "LOW";
  return "BACKGROUND";
}

export function comparePriority(a: TaskPriority, b: TaskPriority): number {
  const order: Record<TaskPriority, number> = {
    CRITICAL: 5,
    HIGH: 4,
    NORMAL: 3,
    LOW: 2,
    BACKGROUND: 1,
  };
  return order[b] - order[a];
}
