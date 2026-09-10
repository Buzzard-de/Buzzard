import { clearAuditLog } from "./audit";
import { resetApprovalCounter } from "./approval";
import { resetConflictCounter } from "./conflict";
import { clearOrchestratorEvents } from "./events";
import { resetObservabilityMetrics } from "./observability";
import { resetEscalationCounter } from "./escalation";
import { clearTaskQueue } from "./taskQueue";
import { clearOrchestratorRegistry } from "./taskRegistry";
import { clearWorkerRegistry, registerDefaultWorkers } from "./workerRegistry";
import { seedDefaultWorkflows } from "./workflow";
import { resetMockWorkerHandlers } from "./worker";
import { seedAiWorkersFixtures } from "@/lib/ai-workers/fixtures";
import type { CreateTaskInput } from "./types";

export const FIXTURE_PRODUCT_TIRE = "reifen-pilot-sport";
export const FIXTURE_PRODUCT_OIL = "motoroel-5w30";
export const FIXTURE_PRODUCT_BRAKE_DISC = "bremsscheibe-280";
export const FIXTURE_PRODUCT_BRAKE_PADS = "bremsbelaege-vorder";
export const FIXTURE_SUPPLIER_A = "TEST_SUPPLIER_A";
export const FIXTURE_CUSTOMER_A = "cust_fixture_a";
export const FIXTURE_CUSTOMER_B = "cust_fixture_b";
export const FIXTURE_ORDER_A = "ord_fixture_a";
export const FIXTURE_RETURN_A = "ret_fixture_a";
export const FIXTURE_MARKET = "DE";
export const FIXTURE_CHANNEL = "WEB";

export function seedOrchestratorFixtures(): void {
  clearOrchestratorRegistry();
  clearWorkerRegistry();
  clearTaskQueue();
  clearOrchestratorEvents();
  clearAuditLog();
  resetObservabilityMetrics();
  resetApprovalCounter();
  resetEscalationCounter();
  resetConflictCounter();
  registerDefaultWorkers();
  seedDefaultWorkflows();
  resetMockWorkerHandlers();
  seedAiWorkersFixtures();
}

export function buildTaskInput(overrides: Partial<CreateTaskInput> = {}): CreateTaskInput {
  return {
    taskType: "PRODUCT_ANALYSIS",
    workerId: "PRODUCT_AI",
    entityType: "PRODUCT",
    entityId: FIXTURE_PRODUCT_TIRE,
    market: FIXTURE_MARKET,
    channel: FIXTURE_CHANNEL,
    language: "de",
    context: {
      productId: FIXTURE_PRODUCT_TIRE,
      market: FIXTURE_MARKET,
    },
    source: "SYSTEM",
    ...overrides,
  };
}

export function buildOrderAnalysisInput(orderId = FIXTURE_ORDER_A): CreateTaskInput {
  return buildTaskInput({
    taskType: "ORDER_ANALYSIS",
    workerId: "ORDER_AI",
    entityType: "ORDER",
    entityId: orderId,
    context: { orderId, market: FIXTURE_MARKET, channel: FIXTURE_CHANNEL },
  });
}

export function buildReturnAnalysisInput(returnId = FIXTURE_RETURN_A): CreateTaskInput {
  return buildTaskInput({
    taskType: "RETURN_ANALYSIS",
    workerId: "RETURNS_AI",
    entityType: "RETURN",
    entityId: returnId,
    context: { returnId, orderId: FIXTURE_ORDER_A, market: FIXTURE_MARKET },
  });
}

export function buildCustomerServiceInput(customerId = FIXTURE_CUSTOMER_A): CreateTaskInput {
  return buildTaskInput({
    taskType: "CUSTOMER_SERVICE",
    workerId: "CUSTOMER_SERVICE_AI",
    entityType: "CUSTOMER",
    entityId: customerId,
    context: {
      customerId,
      orderId: FIXTURE_ORDER_A,
      engineOutputs: { orderStatus: "SHIPPED", refundStatus: "NONE" },
    },
  });
}

export function buildFinanceAnalysisInput(overrides: Partial<CreateTaskInput> = {}): CreateTaskInput {
  return buildTaskInput({
    taskType: "FINANCIAL_RECONCILIATION",
    workerId: "FINANCE_AI",
    entityType: "RETURN",
    entityId: FIXTURE_RETURN_A,
    context: {
      returnId: FIXTURE_RETURN_A,
      orderId: FIXTURE_ORDER_A,
      market: FIXTURE_MARKET,
    },
    ...overrides,
  });
}
