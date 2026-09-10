import type { AiRecommendation, AiTask, TaskContext } from "./types";

const INTERNAL_FIELDS = new Set([
  "supplierCost",
  "buzzardMargin",
  "internalMargin",
  "supplierRecovery",
  "buzzardLoss",
  "buzzardImpact",
  "internalRiskScore",
  "disputeDetails",
  "supplierCreditAmount",
  "supplierRefundAmount",
]);

export function filterCustomerSafeContext(context: TaskContext): TaskContext {
  const safe: TaskContext = {};
  const allowed = [
    "orderId",
    "orderStatus",
    "shipmentStatus",
    "returnStatus",
    "refundStatus",
    "refundAmount",
    "productName",
    "productId",
    "language",
    "market",
    "channel",
  ] as const;

  for (const key of allowed) {
    const val = context[key as keyof TaskContext];
    if (val !== undefined) {
      (safe as Record<string, unknown>)[key] = val;
    }
  }

  if (context.engineOutputs) {
    const safeOutputs: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(context.engineOutputs)) {
      if (!INTERNAL_FIELDS.has(key)) {
        safeOutputs[key] = value;
      }
    }
    if (Object.keys(safeOutputs).length > 0) {
      safe.engineOutputs = safeOutputs;
    }
  }

  return safe;
}

export function toCustomerSafeRecommendation(
  recommendation: AiRecommendation
): Pick<AiRecommendation, "recommendation" | "reasoningSummary"> {
  const rec = recommendation.recommendation;
  if (typeof rec === "object" && rec !== null) {
    const filtered: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rec as Record<string, unknown>)) {
      if (!INTERNAL_FIELDS.has(key)) {
        filtered[key] = value;
      }
    }
    return {
      recommendation: filtered,
      reasoningSummary: recommendation.reasoningSummary,
    };
  }
  return {
    recommendation: rec,
    reasoningSummary: recommendation.reasoningSummary,
  };
}

export function validateCustomerServiceTask(task: AiTask): { ok: boolean; errorCode?: string } {
  if (task.workerId !== "CUSTOMER_SERVICE_AI") return { ok: true };

  for (const key of Object.keys(task.context)) {
    if (INTERNAL_FIELDS.has(key)) {
      return { ok: false, errorCode: "INTERNAL_DATA_IN_CUSTOMER_CONTEXT" };
    }
  }

  if (task.context.engineOutputs) {
    for (const key of Object.keys(task.context.engineOutputs)) {
      if (INTERNAL_FIELDS.has(key)) {
        return { ok: false, errorCode: "INTERNAL_DATA_IN_CUSTOMER_CONTEXT" };
      }
    }
  }

  return { ok: true };
}
