import type {
  AiRecommendation,
  AiTask,
  TaskType,
  WorkerExecuteInput,
  WorkerExecuteResult,
  WorkerId,
} from "./types";
import { getWorker } from "./workerRegistry";
import { buildWorkerContext, sanitizeAiOutput } from "./context";

type MockWorkerHandler = (input: WorkerExecuteInput) => WorkerExecuteResult;

const mockHandlers: Partial<Record<WorkerId, MockWorkerHandler>> = {};

function baseRecommendation(
  task: AiTask,
  recommendation: unknown,
  overrides: Partial<AiRecommendation> = {}
): AiRecommendation {
  return {
    recommendation: sanitizeAiOutput(recommendation),
    confidence: overrides.confidence ?? 0.85,
    reasoningSummary: overrides.reasoningSummary ?? `Mock ${task.taskType} analysis completed`,
    proposedAction: overrides.proposedAction,
    requiredApproval: overrides.requiredApproval ?? false,
    authorityRequired: overrides.authorityRequired ?? "RECOMMEND",
    deterministicValidationRequired: overrides.deterministicValidationRequired ?? true,
  };
}

function registerDefaultMockHandlers(): void {
  mockHandlers.PRODUCT_AI = ({ task, context }) => ({
    ok: true,
    recommendation: baseRecommendation(task, {
      productId: context.productId,
      analysis: "Product data quality acceptable",
      suggestedImprovements: ["Add missing translation"],
    }, {
      reasoningSummary: "Product catalog entry reviewed for completeness",
      authorityRequired: "RECOMMEND",
    }),
  });

  mockHandlers.SUPPLIER_AI = ({ task, context }) => ({
    ok: true,
    recommendation: baseRecommendation(task, {
      supplierId: context.supplierId ?? "TEST_SUPPLIER_A",
      recommendedSupplier: "TEST_SUPPLIER_A",
      healthScore: 0.92,
    }, {
      reasoningSummary: "Supplier reliability and lead time within acceptable range",
    }),
  });

  mockHandlers.PRICING_AI = ({ task, context }) => ({
    ok: true,
    recommendation: baseRecommendation(task, {
      productId: context.productId,
      recommendedPrice: 109.99,
      modifyOrderDirectly: false,
    }, {
      reasoningSummary: "Price recommendation based on margin target — requires Pricing Engine validation",
      requiredApproval: false,
      authorityRequired: "RECOMMEND",
    }),
  });

  mockHandlers.INVENTORY_AI = ({ task, context }) => ({
    ok: true,
    recommendation: baseRecommendation(task, {
      productId: context.productId,
      anomalyDetected: context.metadata?.forceAnomaly === true,
      suggestedAction: "Review stock buffer",
    }, {
      reasoningSummary: "Inventory levels analyzed for anomalies",
      authorityRequired: "ANALYZE",
      deterministicValidationRequired: false,
    }),
  });

  mockHandlers.ORDER_AI = ({ task, context }) => ({
    ok: true,
    recommendation: baseRecommendation(task, {
      orderId: context.orderId,
      riskLevel: "LOW",
      modifyOrderDirectly: false,
    }, {
      reasoningSummary: "Order pattern within normal parameters — Order Engine must perform transitions",
    }),
  });

  mockHandlers.MARKETPLACE_AI = ({ task, context }) => ({
    ok: true,
    recommendation: baseRecommendation(task, {
      marketplaceId: context.marketplaceId,
      listingQuality: "GOOD",
      suggestedUpdates: ["Refresh title keywords"],
    }, {
      reasoningSummary: "Marketplace listing reviewed for optimization opportunities",
    }),
  });

  mockHandlers.CUSTOMS_AI = ({ task, context }) => ({
    ok: true,
    recommendation: baseRecommendation(task, {
      orderId: context.orderId,
      complianceFlags: [],
      reviewRequired: false,
    }, {
      reasoningSummary: "Customs documentation appears complete for target market",
      authorityRequired: "ANALYZE",
    }),
  });

  mockHandlers.CUSTOMER_SERVICE_AI = ({ task, context }) => ({
    ok: true,
    recommendation: baseRecommendation(task, {
      orderStatus: context.engineOutputs?.orderStatus ?? "SHIPPED",
      responseSuggestion: "Your order is on its way",
    }, {
      reasoningSummary: "Customer inquiry addressed using customer-safe order data only",
      authorityRequired: "RECOMMEND",
      deterministicValidationRequired: false,
    }),
  });

  mockHandlers.RETURNS_AI = ({ task, context }) => ({
    ok: true,
    recommendation: baseRecommendation(task, {
      returnId: context.returnId,
      suggestedOutcome: "Standard return processing via Returns Engine",
      modifyReturnDirectly: false,
    }, {
      reasoningSummary: "Return case analyzed — deterministic Returns Engine handles authoritative outcome",
    }),
  });

  mockHandlers.FINANCE_AI = ({ task, context }) => ({
    ok: true,
    recommendation: baseRecommendation(task, {
      returnId: context.returnId,
      orderId: context.orderId,
      anomalyDetected: context.metadata?.forceAnomaly === true,
      overwriteHistorical: false,
      suggestedReview: "Verify supplier recovery against Returns Engine actuals",
    }, {
      reasoningSummary: "Financial reconciliation analysis — cannot overwrite historical contribution",
      requiredApproval: context.metadata?.requiresApproval === true,
      authorityRequired: "ANALYZE",
    }),
  });
}

registerDefaultMockHandlers();

export function resetMockWorkerHandlers(): void {
  for (const key of Object.keys(mockHandlers) as WorkerId[]) {
    delete mockHandlers[key];
  }
  registerDefaultMockHandlers();
}

export function executeMockWorker(task: AiTask): WorkerExecuteResult {
  const worker = getWorker(task.workerId);
  if (!worker) {
    return { ok: false, errorCode: "WORKER_NOT_FOUND", errorMessage: "Worker not registered" };
  }
  if (!worker.enabled) {
    return { ok: false, errorCode: "WORKER_DISABLED", errorMessage: "Worker is disabled" };
  }
  if (worker.healthStatus === "UNHEALTHY") {
    return { ok: false, errorCode: "TRANSIENT_ERROR", errorMessage: "Worker unhealthy" };
  }

  const handler = mockHandlers[task.workerId];
  if (!handler) {
    return { ok: false, errorCode: "NO_MOCK_HANDLER", errorMessage: "No mock handler for worker" };
  }

  const context = buildWorkerContext(task);

  if (task.context.metadata?.simulateTimeout) {
    return { ok: false, errorCode: "WORKER_TIMEOUT", errorMessage: "Simulated worker timeout" };
  }

  if (task.context.metadata?.simulateTransientError) {
    return { ok: false, errorCode: "TRANSIENT_ERROR", errorMessage: "Simulated transient failure" };
  }

  return handler({ task, context });
}

export function registerMockWorkerHandler(workerId: WorkerId, handler: MockWorkerHandler): void {
  mockHandlers[workerId] = handler;
}

export function getSupportedTaskTypesForWorker(workerId: WorkerId): TaskType[] {
  const worker = getWorker(workerId);
  return worker?.supportedTaskTypes ?? [];
}
