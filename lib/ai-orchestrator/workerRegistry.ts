import type { AiWorker, TaskType, WorkerHealthStatus, WorkerId } from "./types";
import { TASK_TYPE_TO_WORKER } from "./constants";

const workers = new Map<WorkerId, AiWorker>();

const DEFAULT_WORKERS: Omit<AiWorker, "registeredAt">[] = [
  {
    workerId: "PRODUCT_AI",
    name: "Product AI Worker",
    version: "1.0.0-foundation",
    capabilities: ["product_analysis", "translation_recommendation"],
    supportedTaskTypes: ["PRODUCT_ANALYSIS", "PRODUCT_TRANSLATION"],
    authorityLevel: "RECOMMEND",
    enabled: true,
    healthStatus: "HEALTHY",
    maxConcurrency: 5,
    requiredPermissions: ["product:read"],
  },
  {
    workerId: "SUPPLIER_AI",
    name: "Supplier AI Worker",
    version: "1.0.0-foundation",
    capabilities: ["supplier_selection", "health_analysis"],
    supportedTaskTypes: ["SUPPLIER_SELECTION", "SUPPLIER_HEALTH_ANALYSIS"],
    authorityLevel: "RECOMMEND",
    enabled: true,
    healthStatus: "HEALTHY",
    maxConcurrency: 5,
    requiredPermissions: ["supplier:read"],
  },
  {
    workerId: "PRICING_AI",
    name: "Pricing AI Worker",
    version: "1.0.0-foundation",
    capabilities: ["price_recommendation"],
    supportedTaskTypes: ["PRICE_RECOMMENDATION"],
    authorityLevel: "RECOMMEND",
    enabled: true,
    healthStatus: "HEALTHY",
    maxConcurrency: 5,
    requiredPermissions: ["pricing:read"],
  },
  {
    workerId: "INVENTORY_AI",
    name: "Inventory AI Worker",
    version: "1.0.0-foundation",
    capabilities: ["inventory_analysis", "anomaly_detection"],
    supportedTaskTypes: ["INVENTORY_ANALYSIS"],
    authorityLevel: "ANALYZE",
    enabled: true,
    healthStatus: "HEALTHY",
    maxConcurrency: 5,
    requiredPermissions: ["inventory:read"],
  },
  {
    workerId: "ORDER_AI",
    name: "Order AI Worker",
    version: "1.0.0-foundation",
    capabilities: ["order_analysis"],
    supportedTaskTypes: ["ORDER_ANALYSIS"],
    authorityLevel: "ANALYZE",
    enabled: true,
    healthStatus: "HEALTHY",
    maxConcurrency: 5,
    requiredPermissions: ["order:read"],
  },
  {
    workerId: "MARKETPLACE_AI",
    name: "Marketplace AI Worker",
    version: "1.0.0-foundation",
    capabilities: ["listing_analysis"],
    supportedTaskTypes: ["MARKETPLACE_LISTING_ANALYSIS"],
    authorityLevel: "RECOMMEND",
    enabled: true,
    healthStatus: "HEALTHY",
    maxConcurrency: 5,
    requiredPermissions: ["marketplace:read"],
  },
  {
    workerId: "CUSTOMS_AI",
    name: "Customs AI Worker",
    version: "1.0.0-foundation",
    capabilities: ["customs_analysis"],
    supportedTaskTypes: ["CUSTOMS_ANALYSIS"],
    authorityLevel: "ANALYZE",
    enabled: true,
    healthStatus: "HEALTHY",
    maxConcurrency: 3,
    requiredPermissions: ["customs:read"],
  },
  {
    workerId: "CUSTOMER_SERVICE_AI",
    name: "Customer Service AI Worker",
    version: "1.0.0-foundation",
    capabilities: ["customer_support"],
    supportedTaskTypes: ["CUSTOMER_SERVICE"],
    authorityLevel: "RECOMMEND",
    enabled: true,
    healthStatus: "HEALTHY",
    maxConcurrency: 10,
    requiredPermissions: ["customer:read"],
  },
  {
    workerId: "RETURNS_AI",
    name: "Returns AI Worker",
    version: "1.0.0-foundation",
    capabilities: ["return_analysis"],
    supportedTaskTypes: ["RETURN_ANALYSIS"],
    authorityLevel: "ANALYZE",
    enabled: true,
    healthStatus: "HEALTHY",
    maxConcurrency: 5,
    requiredPermissions: ["returns:read"],
  },
  {
    workerId: "FINANCE_AI",
    name: "Finance AI Worker",
    version: "1.0.0-foundation",
    capabilities: ["financial_reconciliation", "anomaly_detection"],
    supportedTaskTypes: [
      "FINANCIAL_RECONCILIATION",
      "ANOMALY_DETECTION",
      "EXCEPTION_REVIEW",
      "HUMAN_APPROVAL_REQUIRED",
    ],
    authorityLevel: "ANALYZE",
    enabled: true,
    healthStatus: "HEALTHY",
    maxConcurrency: 3,
    requiredPermissions: ["finance:read"],
  },
];

export function registerWorker(worker: AiWorker): void {
  workers.set(worker.workerId, worker);
}

export function registerDefaultWorkers(): void {
  for (const w of DEFAULT_WORKERS) {
    registerWorker({ ...w, registeredAt: new Date().toISOString() });
  }
}

export function getWorker(workerId: WorkerId): AiWorker | undefined {
  return workers.get(workerId);
}

export function listWorkers(): AiWorker[] {
  return [...workers.values()];
}

export function enableWorker(workerId: WorkerId): boolean {
  const worker = workers.get(workerId);
  if (!worker) return false;
  worker.enabled = true;
  worker.healthStatus = worker.healthStatus === "DISABLED" ? "HEALTHY" : worker.healthStatus;
  return true;
}

export function disableWorker(workerId: WorkerId): boolean {
  const worker = workers.get(workerId);
  if (!worker) return false;
  worker.enabled = false;
  worker.healthStatus = "DISABLED";
  return true;
}

export function setWorkerHealth(workerId: WorkerId, health: WorkerHealthStatus): boolean {
  const worker = workers.get(workerId);
  if (!worker) return false;
  worker.healthStatus = health;
  return true;
}

export function findWorkerForTaskType(taskType: TaskType): WorkerId | undefined {
  const defaultWorker = TASK_TYPE_TO_WORKER[taskType];
  const worker = workers.get(defaultWorker);
  if (worker?.enabled && worker.supportedTaskTypes.includes(taskType)) {
    return defaultWorker;
  }
  for (const w of workers.values()) {
    if (w.enabled && w.supportedTaskTypes.includes(taskType)) {
      return w.workerId;
    }
  }
  return undefined;
}

export function discoverWorkerCapabilities(): Record<WorkerId, string[]> {
  const result = {} as Record<WorkerId, string[]>;
  for (const w of workers.values()) {
    result[w.workerId] = [...w.capabilities];
  }
  return result;
}

export function clearWorkerRegistry(): void {
  workers.clear();
}
