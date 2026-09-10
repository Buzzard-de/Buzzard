import type { AuthorityLevel, TaskType, WorkerId } from "./types";

export const DEFAULT_MAX_RETRIES = 3;
export const DEFAULT_TASK_TIMEOUT_MS = 300_000;

export const TASK_TYPE_REGISTRY: TaskType[] = [
  "PRODUCT_ANALYSIS",
  "PRODUCT_TRANSLATION",
  "SUPPLIER_SELECTION",
  "SUPPLIER_HEALTH_ANALYSIS",
  "PRICE_RECOMMENDATION",
  "INVENTORY_ANALYSIS",
  "ORDER_ANALYSIS",
  "MARKETPLACE_LISTING_ANALYSIS",
  "CUSTOMS_ANALYSIS",
  "CUSTOMER_SERVICE",
  "RETURN_ANALYSIS",
  "FINANCIAL_RECONCILIATION",
  "ANOMALY_DETECTION",
  "EXCEPTION_REVIEW",
  "HUMAN_APPROVAL_REQUIRED",
];

export const PRIORITY_WEIGHTS = {
  customerImpact: 30,
  financialImpact: 25,
  orderUrgency: 20,
  inventoryRisk: 15,
  supplierFailure: 15,
  marketplaceSla: 10,
  returnRefundUrgency: 20,
  complianceRisk: 25,
  dependencyBlocking: 10,
  systemHealthDegraded: 5,
} as const;

export const TASK_TYPE_TO_WORKER: Record<TaskType, WorkerId> = {
  PRODUCT_ANALYSIS: "PRODUCT_AI",
  PRODUCT_TRANSLATION: "PRODUCT_AI",
  SUPPLIER_SELECTION: "SUPPLIER_AI",
  SUPPLIER_HEALTH_ANALYSIS: "SUPPLIER_AI",
  PRICE_RECOMMENDATION: "PRICING_AI",
  INVENTORY_ANALYSIS: "INVENTORY_AI",
  ORDER_ANALYSIS: "ORDER_AI",
  MARKETPLACE_LISTING_ANALYSIS: "MARKETPLACE_AI",
  CUSTOMS_ANALYSIS: "CUSTOMS_AI",
  CUSTOMER_SERVICE: "CUSTOMER_SERVICE_AI",
  RETURN_ANALYSIS: "RETURNS_AI",
  FINANCIAL_RECONCILIATION: "FINANCE_AI",
  ANOMALY_DETECTION: "FINANCE_AI",
  EXCEPTION_REVIEW: "FINANCE_AI",
  HUMAN_APPROVAL_REQUIRED: "FINANCE_AI",
};

export const TASK_TYPE_AUTHORITY: Record<TaskType, AuthorityLevel> = {
  PRODUCT_ANALYSIS: "ANALYZE",
  PRODUCT_TRANSLATION: "RECOMMEND",
  SUPPLIER_SELECTION: "RECOMMEND",
  SUPPLIER_HEALTH_ANALYSIS: "ANALYZE",
  PRICE_RECOMMENDATION: "RECOMMEND",
  INVENTORY_ANALYSIS: "ANALYZE",
  ORDER_ANALYSIS: "ANALYZE",
  MARKETPLACE_LISTING_ANALYSIS: "RECOMMEND",
  CUSTOMS_ANALYSIS: "ANALYZE",
  CUSTOMER_SERVICE: "RECOMMEND",
  RETURN_ANALYSIS: "ANALYZE",
  FINANCIAL_RECONCILIATION: "ANALYZE",
  ANOMALY_DETECTION: "OBSERVE",
  EXCEPTION_REVIEW: "RECOMMEND",
  HUMAN_APPROVAL_REQUIRED: "NEVER_EXECUTE",
};

export const SENSITIVE_CONTEXT_KEYS = new Set([
  "apiKey",
  "password",
  "token",
  "secret",
  "credential",
  "supplierCost",
  "buzzardMargin",
  "internalMargin",
  "supplierRecovery",
  "buzzardLoss",
  "paymentCredential",
  "cardNumber",
  "cvv",
]);

export const CUSTOMER_SAFE_CONTEXT_KEYS = new Set([
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
]);

export const SERVER_ONLY_TASK_FIELDS = new Set([
  "status",
  "authorityLevel",
  "deterministicValidation",
  "result",
  "recommendation",
  "escalationState",
  "retryCount",
  "failureReason",
  "failureType",
]);
