import type { WorkerCapabilityProfile, WorkerId } from "./types";
import { WORKER_PERMISSIONS, WORKER_SUPPORTED_TASKS } from "./constants";
import type { AuthorityLevel } from "@/lib/ai-orchestrator/types";

const WORKER_AUTHORITY: Record<WorkerId, AuthorityLevel> = {
  PRODUCT_AI: "RECOMMEND",
  SUPPLIER_AI: "RECOMMEND",
  PRICING_AI: "RECOMMEND",
  INVENTORY_AI: "ANALYZE",
  ORDER_AI: "ANALYZE",
  MARKETPLACE_AI: "RECOMMEND",
  CUSTOMS_AI: "ANALYZE",
  CUSTOMER_SERVICE_AI: "RECOMMEND",
  RETURNS_AI: "ANALYZE",
  FINANCE_AI: "ANALYZE",
};

const WORKER_CAPABILITIES: Record<WorkerId, string[]> = {
  PRODUCT_AI: ["product_analysis", "translation_recommendation"],
  SUPPLIER_AI: ["supplier_selection", "health_analysis"],
  PRICING_AI: ["price_recommendation"],
  INVENTORY_AI: ["inventory_analysis", "anomaly_detection"],
  ORDER_AI: ["order_analysis"],
  MARKETPLACE_AI: ["listing_analysis"],
  CUSTOMS_AI: ["customs_analysis"],
  CUSTOMER_SERVICE_AI: ["customer_support"],
  RETURNS_AI: ["return_analysis"],
  FINANCE_AI: ["financial_reconciliation", "anomaly_detection"],
};

export function getWorkerCapabilityProfile(workerId: WorkerId): WorkerCapabilityProfile {
  return {
    workerId,
    capabilities: WORKER_CAPABILITIES[workerId] ?? [],
    supportedTaskTypes: WORKER_SUPPORTED_TASKS[workerId] ?? [],
    supportedMarkets: ["*"],
    supportedLanguages: ["de", "en", "tr", "ar"],
    supportedActions: getSupportedActions(workerId),
    requiredPermissions: WORKER_PERMISSIONS[workerId] ?? [],
    authorityLevel: WORKER_AUTHORITY[workerId] ?? "ANALYZE",
    version: "1.0.0-foundation",
  };
}

function getSupportedActions(workerId: WorkerId): WorkerCapabilityProfile["supportedActions"] {
  switch (workerId) {
    case "PRICING_AI":
    case "SUPPLIER_AI":
    case "MARKETPLACE_AI":
      return ["OBSERVATION", "RECOMMENDATION", "LOW_RISK_ACTION"];
    case "FINANCE_AI":
    case "RETURNS_AI":
      return ["OBSERVATION", "RECOMMENDATION", "HIGH_RISK_ACTION"];
    case "ORDER_AI":
    case "INVENTORY_AI":
    case "CUSTOMS_AI":
      return ["OBSERVATION", "RECOMMENDATION"];
    default:
      return ["OBSERVATION", "RECOMMENDATION"];
  }
}

export function discoverAllCapabilities(): Record<WorkerId, WorkerCapabilityProfile> {
  const workers = Object.keys(WORKER_CAPABILITIES) as WorkerId[];
  const result = {} as Record<WorkerId, WorkerCapabilityProfile>;
  for (const w of workers) {
    result[w] = getWorkerCapabilityProfile(w);
  }
  return result;
}
