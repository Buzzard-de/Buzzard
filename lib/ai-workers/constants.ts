import type { ContextClassification, WorkerId, WorkerPermission } from "./types";
import type { TaskType } from "@/lib/ai-orchestrator/types";

export const INPUT_SCHEMA_VERSION = "1.0.0";
export const OUTPUT_SCHEMA_VERSION = "1.0.0";
export const DEFAULT_EXECUTION_TIMEOUT_MS = 30_000;

export const MOCK_PROVIDER_ID = "MOCK_PROVIDER";

export const CONTEXT_FIELD_CLASSIFICATION: Record<string, ContextClassification> = {
  productId: "PUBLIC",
  productName: "PUBLIC",
  market: "PUBLIC",
  channel: "PUBLIC",
  language: "PUBLIC",
  orderId: "INTERNAL",
  orderStatus: "CUSTOMER_SAFE",
  shipmentStatus: "CUSTOMER_SAFE",
  returnId: "INTERNAL",
  returnStatus: "CUSTOMER_SAFE",
  refundStatus: "CUSTOMER_SAFE",
  refundAmount: "CUSTOMER_SAFE",
  supplierId: "INTERNAL",
  marketplaceId: "INTERNAL",
  customerId: "SENSITIVE",
  engineOutputs: "INTERNAL",
  metadata: "INTERNAL",
  supplierCost: "FINANCIAL",
  buzzardMargin: "FINANCIAL",
  internalMargin: "FINANCIAL",
  supplierRecovery: "FINANCIAL",
  buzzardLoss: "FINANCIAL",
  apiKey: "SECRET",
  password: "SECRET",
  token: "SECRET",
  secret: "SECRET",
  credential: "SECRET",
  paymentCredential: "SECRET",
  cardNumber: "SECRET",
  cvv: "SECRET",
};

export const WORKER_PERMISSIONS: Record<WorkerId, WorkerPermission[]> = {
  PRODUCT_AI: ["READ_PRODUCT"],
  SUPPLIER_AI: ["READ_PRODUCT", "READ_SUPPLIER", "RECOMMEND_SUPPLIER"],
  PRICING_AI: ["READ_PRODUCT", "READ_SUPPLIER", "READ_PRICING", "RECOMMEND_PRICE"],
  INVENTORY_AI: ["READ_PRODUCT", "READ_SUPPLIER", "READ_INVENTORY"],
  ORDER_AI: ["READ_ORDER", "READ_PRODUCT", "RECOMMEND_ORDER_ACTION"],
  MARKETPLACE_AI: ["READ_MARKETPLACE", "READ_PRODUCT", "RECOMMEND_MARKETPLACE_ACTION"],
  CUSTOMS_AI: ["READ_PRODUCT", "READ_ORDER"],
  CUSTOMER_SERVICE_AI: ["READ_ORDER", "CUSTOMER_SAFE_DATA"],
  RETURNS_AI: ["READ_RETURN", "READ_ORDER", "RECOMMEND_REFUND"],
  FINANCE_AI: ["READ_FINANCIAL", "READ_RETURN", "READ_ORDER", "READ_PRICING"],
};

export const WORKER_CONTEXT_ALLOWLIST: Record<WorkerId, Set<string>> = {
  PRODUCT_AI: new Set(["productId", "market", "channel", "language", "engineOutputs", "metadata"]),
  SUPPLIER_AI: new Set(["productId", "supplierId", "market", "engineOutputs", "metadata"]),
  PRICING_AI: new Set(["productId", "supplierId", "market", "channel", "engineOutputs", "metadata"]),
  INVENTORY_AI: new Set(["productId", "supplierId", "market", "engineOutputs", "metadata"]),
  ORDER_AI: new Set(["orderId", "customerId", "market", "channel", "engineOutputs", "metadata"]),
  MARKETPLACE_AI: new Set(["marketplaceId", "productId", "market", "engineOutputs", "metadata"]),
  CUSTOMS_AI: new Set(["orderId", "productId", "market", "engineOutputs", "metadata"]),
  CUSTOMER_SERVICE_AI: new Set([
    "orderId",
    "customerId",
    "market",
    "channel",
    "language",
    "engineOutputs",
    "metadata",
  ]),
  RETURNS_AI: new Set(["returnId", "orderId", "market", "engineOutputs", "metadata"]),
  FINANCE_AI: new Set(["returnId", "orderId", "market", "engineOutputs", "metadata"]),
};

export const WORKER_SUPPORTED_TASKS: Record<WorkerId, TaskType[]> = {
  PRODUCT_AI: ["PRODUCT_ANALYSIS", "PRODUCT_TRANSLATION"],
  SUPPLIER_AI: ["SUPPLIER_SELECTION", "SUPPLIER_HEALTH_ANALYSIS"],
  PRICING_AI: ["PRICE_RECOMMENDATION"],
  INVENTORY_AI: ["INVENTORY_ANALYSIS"],
  ORDER_AI: ["ORDER_ANALYSIS"],
  MARKETPLACE_AI: ["MARKETPLACE_LISTING_ANALYSIS"],
  CUSTOMS_AI: ["CUSTOMS_ANALYSIS"],
  CUSTOMER_SERVICE_AI: ["CUSTOMER_SERVICE"],
  RETURNS_AI: ["RETURN_ANALYSIS"],
  FINANCE_AI: ["FINANCIAL_RECONCILIATION", "ANOMALY_DETECTION", "EXCEPTION_REVIEW"],
};

export const VALID_EXECUTION_TRANSITIONS: Record<string, ExecutionStatus[]> = {
  CREATED: ["VALIDATING", "CANCELLED"],
  VALIDATING: ["AUTHORIZED", "REJECTED", "FAILED", "CANCELLED"],
  AUTHORIZED: ["CONTEXT_READY", "REJECTED", "FAILED", "CANCELLED"],
  CONTEXT_READY: ["RUNNING", "REJECTED", "FAILED", "CANCELLED"],
  RUNNING: ["OUTPUT_RECEIVED", "TIMED_OUT", "FAILED", "CANCELLED"],
  OUTPUT_RECEIVED: ["VALIDATING_OUTPUT", "FAILED", "CANCELLED"],
  VALIDATING_OUTPUT: ["DETERMINISTIC_VALIDATION", "REJECTED", "FAILED"],
  DETERMINISTIC_VALIDATION: ["WAITING_APPROVAL", "COMPLETED", "REJECTED", "ESCALATED", "FAILED"],
  WAITING_APPROVAL: ["COMPLETED", "REJECTED", "CANCELLED"],
  COMPLETED: [],
  REJECTED: [],
  FAILED: [],
  CANCELLED: [],
  TIMED_OUT: [],
  ESCALATED: [],
};

type ExecutionStatus = import("./types").ExecutionStatus;

export const FORBIDDEN_WORKER_ACTIONS = new Set([
  "MODIFY_ORDER_STATUS",
  "SET_AUTHORITATIVE_PRICE",
  "CREATE_INVENTORY_RESERVATION",
  "ISSUE_REFUND",
  "CREATE_SUPPLIER_PAYMENT",
  "OVERWRITE_HISTORICAL_MARGIN",
  "OVERWRITE_RETURN_IMPACT",
  "AUTONOMOUS_CUSTOMS_DECLARATION",
]);
