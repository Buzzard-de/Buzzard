import type { AiTask } from "@/lib/ai-orchestrator/types";
import type { WorkerId } from "./types";
import { clearExecutionRegistry } from "./executionRegistry";
import { clearProviderRegistry, registerDefaultProviders } from "./providerRegistry";
import { clearWorkerAuditLog } from "./audit";
import { resetTelemetry } from "./telemetry";
import { resetMockWorkers } from "./mockWorkers";

export const FIXTURE_PRODUCT = "reifen-pilot-sport";
export const FIXTURE_SUPPLIER = "TEST_SUPPLIER_A";
export const FIXTURE_ORDER = "ord_fixture_a";
export const FIXTURE_RETURN = "ret_fixture_a";
export const FIXTURE_CUSTOMER = "cust_fixture_a";
export const FIXTURE_MARKET = "DE";

export function seedAiWorkersFixtures(): void {
  clearExecutionRegistry();
  clearProviderRegistry();
  clearWorkerAuditLog();
  resetTelemetry();
  resetMockWorkers();
  registerDefaultProviders();
}

export function buildFixtureTask(overrides: Partial<AiTask> & { workerId: WorkerId; taskType: AiTask["taskType"] }): AiTask {
  const { workerId, taskType, ...rest } = overrides;
  return {
    taskId: `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    status: "READY",
    priority: "NORMAL",
    source: "SYSTEM",
    entityType: "NONE",
    entityId: "",
    market: FIXTURE_MARKET,
    channel: "WEB",
    language: "de",
    context: {},
    dependencies: [],
    requiredApprovals: [],
    authorityLevel: "RECOMMEND",
    createdAt: new Date().toISOString(),
    retryCount: 0,
    maxRetries: 3,
    retryable: true,
    escalationState: "NONE",
    correlationId: `corr_${Date.now()}`,
    ...rest,
    workerId,
    taskType,
  };
}
