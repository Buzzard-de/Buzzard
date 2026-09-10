import type { AiTask, TaskType } from "@/lib/ai-orchestrator/types";
import type {
  ProviderHealthStatus,
  StructuredWorkerOutput,
  WorkerContext,
  WorkerContract,
  WorkerExecutionInput,
  WorkerId,
} from "./types";
import { WORKER_SUPPORTED_TASKS } from "./constants";
import { getWorkerCapabilityProfile } from "./capabilities";
import { buildProposedAction } from "./action";
import { validateWorkerOutput } from "./workerOutput";

function baseOutput(
  task: AiTask,
  recommendation: unknown,
  overrides: Partial<StructuredWorkerOutput> = {}
): StructuredWorkerOutput {
  return {
    recommendation,
    confidence: overrides.confidence ?? 0.85,
    reasoningSummary: overrides.reasoningSummary ?? `Mock ${task.taskType} analysis completed`,
    proposedAction: overrides.proposedAction,
    requiredApproval: overrides.requiredApproval ?? false,
    authorityRequired: overrides.authorityRequired ?? "RECOMMEND",
    deterministicValidationRequired: overrides.deterministicValidationRequired ?? true,
    action: overrides.action,
  };
}

function createWorker(
  workerId: WorkerId,
  executeFn: (context: WorkerContext, task: AiTask) => StructuredWorkerOutput
): WorkerContract {
  return {
    workerId,
    canHandle(taskType: TaskType) {
      return (WORKER_SUPPORTED_TASKS[workerId] ?? []).includes(taskType);
    },
    validateInput(input: WorkerExecutionInput) {
      const errors: string[] = [];
      if (!this.canHandle(input.task.taskType)) errors.push("UNSUPPORTED_TASK_TYPE");
      return { ok: errors.length === 0, errors };
    },
    execute: executeFn,
    validateOutput(output: StructuredWorkerOutput) {
      return validateWorkerOutput(output);
    },
    getCapabilities() {
      return getWorkerCapabilityProfile(workerId);
    },
    getVersion() {
      return "1.0.0-foundation";
    },
    getHealth(): ProviderHealthStatus {
      return "HEALTHY";
    },
  };
}

const workers = new Map<WorkerId, WorkerContract>();

function registerAllWorkers(): void {
  workers.set("PRODUCT_AI", createWorker("PRODUCT_AI", (context, task) =>
    baseOutput(task, {
      productId: context.productId,
      analysis: "Product data quality acceptable",
      suggestedImprovements: ["Add missing translation"],
      overwriteCanonicalProduct: false,
    }, {
      reasoningSummary: "Product catalog entry reviewed — canonical data controlled by PIM",
      action: buildProposedAction({
        actionType: "RECOMMEND_ATTRIBUTE",
        entityType: "PRODUCT",
        entityId: context.productId ?? "",
        category: "RECOMMENDATION",
      }),
    })
  ));

  workers.set("SUPPLIER_AI", createWorker("SUPPLIER_AI", (context, task) =>
    baseOutput(task, {
      supplierId: context.supplierId ?? "TEST_SUPPLIER_A",
      recommendedSupplier: "TEST_SUPPLIER_A",
      healthScore: 0.92,
      inventSupplierStock: false,
      inventSupplierPrice: false,
    }, {
      reasoningSummary: "Supplier recommendation based on Supplier Integration Engine data",
      action: buildProposedAction({
        actionType: "RECOMMEND_SUPPLIER",
        entityType: "SUPPLIER",
        entityId: context.supplierId ?? "TEST_SUPPLIER_A",
        category: "RECOMMENDATION",
      }),
    })
  ));

  workers.set("PRICING_AI", createWorker("PRICING_AI", (context, task) =>
    baseOutput(task, {
      productId: context.productId,
      recommendedPrice: context.metadata?.forceBadPrice === true ? -10 : 109.99,
      setAuthoritativePrice: false,
    }, {
      reasoningSummary: "Price recommendation — authoritative price controlled by Pricing Engine",
      requiredApproval: context.metadata?.requiresApproval === true,
      action: buildProposedAction({
        actionType: "RECOMMEND_PRICE",
        entityType: "PRODUCT",
        entityId: context.productId ?? "",
        financialImpact: 109.99,
        category: "RECOMMENDATION",
      }),
    })
  ));

  workers.set("INVENTORY_AI", createWorker("INVENTORY_AI", (context, task) =>
    baseOutput(task, {
      productId: context.productId,
      anomalyDetected: context.metadata?.forceAnomaly === true,
      createReservation: false,
      overrideStock: false,
    }, {
      reasoningSummary: "Inventory anomaly analysis — stock source of truth is Inventory Engine",
      authorityRequired: "ANALYZE",
      deterministicValidationRequired: false,
    })
  ));

  workers.set("ORDER_AI", createWorker("ORDER_AI", (context, task) =>
    baseOutput(task, {
      orderId: context.orderId,
      riskLevel: "LOW",
      modifyOrderDirectly: false,
      modifyPaymentState: false,
    }, {
      reasoningSummary: "Order analysis — transitions must go through Order Engine",
    })
  ));

  workers.set("MARKETPLACE_AI", createWorker("MARKETPLACE_AI", (context, task) =>
    baseOutput(task, {
      marketplaceId: context.marketplaceId,
      listingQuality: "GOOD",
      bypassMarketplaceEngine: false,
    }, {
      reasoningSummary: "Marketplace listing optimization recommendation",
      action: buildProposedAction({
        actionType: "RECOMMEND_LISTING",
        entityType: "MARKETPLACE_LISTING",
        entityId: context.marketplaceId ?? "",
        category: "RECOMMENDATION",
      }),
    })
  ));

  workers.set("CUSTOMS_AI", createWorker("CUSTOMS_AI", (context, task) =>
    baseOutput(task, {
      orderId: context.orderId,
      complianceFlags: [],
      autonomousDeclaration: false,
    }, {
      reasoningSummary: "Customs classification review — no autonomous declarations",
      authorityRequired: "ANALYZE",
    })
  ));

  workers.set("CUSTOMER_SERVICE_AI", createWorker("CUSTOMER_SERVICE_AI", (context, task) =>
    baseOutput(task, {
      orderStatus: context.engineOutputs?.orderStatus ?? "SHIPPED",
      responseSuggestion: "Your order is on its way",
    }, {
      reasoningSummary: "Customer-safe response using visible order data only",
      deterministicValidationRequired: false,
    })
  ));

  workers.set("RETURNS_AI", createWorker("RETURNS_AI", (context, task) =>
    baseOutput(task, {
      returnId: context.returnId,
      suggestedOutcome: "Process via Returns Engine",
      inventSupplierRecovery: false,
      modifyReturnDirectly: false,
    }, {
      reasoningSummary: "Return analysis — authoritative outcome from Returns Engine",
    })
  ));

  workers.set("FINANCE_AI", createWorker("FINANCE_AI", (context, task) =>
    baseOutput(task, {
      returnId: context.returnId,
      orderId: context.orderId,
      anomalyDetected: context.metadata?.forceAnomaly === true,
      overwriteHistorical: context.metadata?.forceOverwriteHistorical === true,
      overwriteReturnImpact: false,
    }, {
      reasoningSummary: "Financial reconciliation analysis — cannot overwrite historical contribution",
      requiredApproval: context.metadata?.requiresApproval === true,
      authorityRequired: "ANALYZE",
    })
  ));
}

registerAllWorkers();

export function getWorkerContract(workerId: WorkerId): WorkerContract | undefined {
  return workers.get(workerId);
}

export function listWorkerContracts(): WorkerContract[] {
  return [...workers.values()];
}

export function resetMockWorkers(): void {
  workers.clear();
  registerAllWorkers();
}
